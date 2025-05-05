console.log('Renderer process starting');

const { ipcRenderer } = require('electron');

try {
  async function loadNotebooks() {
    console.log('Loading notebooks');
    const notebookList = document.getElementById('notebookList');
    const notebookSelector = document.getElementById('notebookSelector');
    const openButton = document.getElementById('openNotebook');

    if (!notebookList || !notebookSelector || !openButton) {
      console.error('DOM elements missing');
      notebookList.textContent = 'Error: UI elements not found';
      return;
    }

    try {
      const notebooks = await ipcRenderer.invoke('list-notebooks');
      console.log('Notebooks received:', notebooks);
      if (notebooks.length === 0) {
        notebookList.textContent = 'EMPTY';
        notebookSelector.style.display = 'none';
        openButton.disabled = true;
      } else {
        notebookList.innerHTML = '';
        notebookSelector.innerHTML = '';
        notebookSelector.style.display = 'block';
        openButton.disabled = true;

        // biome-ignore lint/complexity/noForEach: <explanation>
        notebooks.forEach((notebook) => {
          const option = document.createElement('option');
          option.value = notebook.dir;
          option.textContent = notebook.name;
          notebookSelector.appendChild(option);

          const notebookItem = document.createElement('div');
          notebookItem.className = 'notebook-item';
          notebookItem.textContent = notebook.name;
          notebookItem.addEventListener('click', () => {
            notebookSelector.value = notebook.dir;
            notebookSelector.dispatchEvent(new Event('change'));
          });
          notebookList.appendChild(notebookItem);
        });

        if (notebooks.length > 0) {
          notebookSelector.value = notebooks[0].dir;
          openButton.disabled = false;
        }
      }
    } catch (err) {
      console.error('Error loading notebooks:', err);
      notebookList.textContent = 'Error loading notebooks';
      notebookSelector.style.display = 'none';
      openButton.disabled = true;
    }
  }

  const createButton = document.getElementById('createNotebook');
  if (createButton) {
    createButton.addEventListener('click', async () => {
      console.log('Create notebook clicked');
      const notebookName = document.getElementById('notebookName').value.trim();
      if (!notebookName) {
        alert('Please enter a notebook name');
        return;
      }

      try {
        const notebookDir = await ipcRenderer.invoke('create-notebook', notebookName);
        console.log('Notebook created:', notebookDir);
        await ipcRenderer.invoke('open-notebook-window', notebookDir);
        await loadNotebooks();
      } catch (err) {
        console.error('Error creating notebook:', err);
        alert(`Error creating notebook: ${err.message}`);
      }
    });
  } else {
    console.error('Create button not found');
  }

  const openButton = document.getElementById('openNotebook');
  if (openButton) {
    openButton.addEventListener('click', async () => {
      console.log('Open notebook clicked');
      const notebookSelector = document.getElementById('notebookSelector');
      const notebookDir = notebookSelector.value;
      if (notebookDir) {
        try {
          await ipcRenderer.invoke('open-notebook-window', notebookDir);
          console.log('Notebook window opened:', notebookDir);
        } catch (err) {
          console.error('Error opening notebook:', err);
          alert(`Error opening notebook: ${err.message}`);
        }
      }
    });
  } else {
    console.error('Open button not found');
  }

  const notebookSelector = document.getElementById('notebookSelector');
  if (notebookSelector) {
    notebookSelector.addEventListener('change', () => {
      console.log('Notebook selector changed');
      document.getElementById('openNotebook').disabled = !notebookSelector.value;
    });
  } else {
    console.error('Notebook selector not found');
  }

  console.log('Calling loadNotebooks');
  loadNotebooks();
} catch (err) {
  console.error('Renderer error:', err);
  // biome-ignore lint/style/useTemplate: <explanation>
  document.body.innerHTML = '<h1>Error: Renderer failed to initialize</h1><p>' + err.message + '</p>';
}