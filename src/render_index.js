console.log('Renderer process starting');

const { ipcRenderer } = require('electron');

try {
  async function loadNotebooks() {
    console.log('Loading notebooks');
    const notebookGrid = document.getElementById('notebookGrid');
    const noNotebooks = document.getElementById('noNotebooks');
    const selectedNotebook = document.getElementById('selectedNotebook');
    const selectedNotebookName = document.querySelector('.selected-notebook-name');
    const openButton = document.getElementById('openNotebook');

    if (!notebookGrid || !noNotebooks || !selectedNotebook || !selectedNotebookName || !openButton) {
      console.error('DOM elements missing:', {
        notebookGrid: !!notebookGrid,
        noNotebooks: !!noNotebooks,
        selectedNotebook: !!selectedNotebook,
        selectedNotebookName: !!selectedNotebookName,
        openButton: !!openButton
      });
      document.body.innerHTML = '<h1>Error: UI elements not found</h1>';
      return;
    }

    try {
      const notebooks = await ipcRenderer.invoke('list-notebooks');
      console.log('Notebooks received:', notebooks);

      notebookGrid.innerHTML = '';
      noNotebooks.style.display = notebooks.length === 0 ? 'block' : 'none';
      selectedNotebook.style.display = 'none';
      openButton.disabled = true;

      // biome-ignore lint/complexity/noForEach: <explanation>
      notebooks.forEach((notebook) => {
        const card = document.createElement('div');
        card.className = 'column is-3 notebook-card';
        card.innerHTML = `
          <div class="icon">
            <i class="fas fa-book"></i>
          </div>
          <div class="name">${notebook.name}</div>
        `;
        card.dataset.dir = notebook.dir;
        card.addEventListener('click', () => {
          // biome-ignore lint/complexity/noForEach: <explanation>
          document.querySelectorAll('.notebook-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          selectedNotebookName.textContent = notebook.name;
          selectedNotebook.style.display = 'block';
          openButton.disabled = false;
          openButton.dataset.dir = notebook.dir;
        });
        notebookGrid.appendChild(card);
      });
    } catch (err) {
      console.error('Error loading notebooks:', err);
      noNotebooks.textContent = `Error loading notebooks: ${err.message}`;
      noNotebooks.style.display = 'block';
      selectedNotebook.style.display = 'none';
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
      const notebookDir = openButton.dataset.dir;
      if (notebookDir) {
        try {
          await ipcRenderer.invoke('open-notebook-window', notebookDir);
          console.log('Notebook window opened:', notebookDir);
        } catch (err) {
          console.error('Error opening notebook:', err);
          alert(`Error opening notebook: ${err.message}`);
        }
      } else {
        console.error('No notebook directory set for open button');
      }
    });
  } else {
    console.error('Open button not found');
  }

  console.log('Calling loadNotebooks');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM content loaded');
    loadNotebooks();
  });
} catch (err) {
  console.error('Renderer error:', err);
  document.body.innerHTML = `<h1>Error: Renderer failed to initialize</h1><p>${err.message}</p>`;
}