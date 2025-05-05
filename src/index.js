const { app, BrowserWindow, ipcMain } = require('electron');
// biome-ignore lint/style/useNodejsImportProtocol: <explanation>
const path = require('path');
// biome-ignore lint/style/useNodejsImportProtocol: <explanation>
const fs = require('fs').promises;

console.log('Main process starting');

let mainWindow;

function createWindow() {
  console.log('Creating window');
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'render_index.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  const indexPath = path.join(__dirname, 'index.html');
  console.log('Loading file:', indexPath);

  mainWindow.loadFile(indexPath).then(() => {
    console.log('index.html loaded successfully');
  }).catch((err) => {
    console.error('Failed to load index.html:', err);
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Window failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('Renderer process crashed:', details);
  });

  mainWindow.webContents.openDevTools();
}

function createNotebookWindow(notebookDir) {
  console.log('Creating notebook window for:', notebookDir);
  const notebookWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'render_notebook.js'),
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  notebookWindow.loadFile('src/notebook.html', {
    query: { notebookDir: encodeURIComponent(notebookDir) }
  }).catch((err) => {
    console.error('Failed to load notebook.html:', err);
  });
}

app.whenReady().then(() => {
  console.log('App is ready');
  createWindow();
}).catch((err) => {
  console.error('App failed to start:', err);
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC to create a new notebook
ipcMain.handle('create-notebook', async (event, notebookName) => {
  console.log('Creating notebook:', notebookName);
  const notebooksDir = path.join(__dirname, 'notebooks');
  try {
    await fs.mkdir(notebooksDir, { recursive: true });
    const notebookDir = path.join(notebooksDir, notebookName);
    if (await fs.access(notebookDir).then(() => true).catch(() => false)) {
      throw new Error('Notebook already exists');
    }

    await fs.mkdir(notebookDir);
    const metadata = { name: notebookName, pages: 1 };
    await fs.writeFile(path.join(notebookDir, 'metadata.json'), JSON.stringify(metadata));
    await fs.writeFile(path.join(notebookDir, 'page1.png'), Buffer.from([]));
    console.log('Notebook created:', notebookDir);
    return notebookDir;
  } catch (err) {
    console.error('Failed to create notebook:', err);
    throw new Error(`Failed to create notebook: ${err.message}`);
  }
});

// IPC to list notebooks
ipcMain.handle('list-notebooks', async () => {
  console.log('Listing notebooks');
  const notebooksDir = path.join(__dirname, 'notebooks');
  try {
    await fs.mkdir(notebooksDir, { recursive: true });
    const dirs = await fs.readdir(notebooksDir, { withFileTypes: true });
    const notebooks = [];
    for (const dir of dirs) {
      if (dir.isDirectory()) {
        const metadataPath = path.join(notebooksDir, dir.name, 'metadata.json');
        if (await fs.access(metadataPath).then(() => true).catch(() => false)) {
          try {
            const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
            notebooks.push({ name: metadata.name, dir: path.join(notebooksDir, dir.name) });
          } catch (err) {
            console.error(`Failed to read metadata for ${dir.name}:`, err);
          }
        }
      }
    }
    console.log('Notebooks found:', notebooks);
    return notebooks;
  } catch (err) {
    console.error('Failed to list notebooks:', err);
    return [];
  }
});

// IPC to open a notebook window
ipcMain.handle('open-notebook-window', async (event, notebookDir) => {
  console.log('Opening notebook window:', notebookDir);
  try {
    createNotebookWindow(notebookDir);
    return true;
  } catch (err) {
    console.error('Failed to open notebook window:', err);
    throw new Error(`Failed to open notebook: ${err.message}`);
  }
});

// IPC to load notebook metadata
ipcMain.handle('load-metadata', async (event, notebookDir) => {
  console.log('Loading metadata for:', notebookDir);
  try {
    const metadataPath = path.join(notebookDir, 'metadata.json');
    const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
    return metadata;
  } catch (err) {
    console.error('Failed to load metadata:', err);
    throw new Error(`Failed to load metadata: ${err.message}`);
  }
});

// IPC to save notebook
ipcMain.handle('save-notebook', async (event, notebookDir, metadata, pages) => {
  console.log('Saving notebook:', notebookDir);
  try {
    await fs.writeFile(path.join(notebookDir, 'metadata.json'), JSON.stringify(metadata));
    for (let i = 1; i <= metadata.pages; i++) {
      const dataUrl = pages[i - 1];
      if (dataUrl) {
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        await fs.writeFile(path.join(notebookDir, `page${i}.png`), Buffer.from(base64Data, 'base64'));
      }
    }
    console.log('Notebook saved');
  } catch (err) {
    console.error('Failed to save notebook:', err);
    throw new Error(`Failed to save notebook: ${err.message}`);
  }
});

// IPC to show homepage
ipcMain.handle('show-homepage', async () => {
  console.log('Showing homepage');
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.focus();
      console.log('Focused existing main window');
    } else {
      console.log('Creating new main window');
      createWindow();
    }
    return true;
  } catch (err) {
    console.error('Failed to show homepage:', err);
    throw new Error(`Failed to show homepage: ${err.message}`);
  }
});

// IPC to close notebook window
ipcMain.on('close-notebook-window', (event) => {
  console.log('Closing notebook window');
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.close();
    console.log('Notebook window closed');
  } else {
    console.error('No window found to close');
  }
});