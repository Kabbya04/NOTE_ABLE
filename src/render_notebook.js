const { ipcRenderer } = require('electron');
const { jsPDF } = require('jspdf');

console.log('Renderer notebook process starting');

try {
  const urlParams = new URLSearchParams(window.location.search);
  const notebookDir = decodeURIComponent(urlParams.get('notebookDir'));
  console.log('Notebook directory:', notebookDir);

  let metadata = { name: '', pages: 1 };
  let currentPage = 1;
  const canvas = document.getElementById('drawingCanvas');
  const ctx = canvas.getContext('2d');
  const pageImages = [];

  canvas.width = 800;
  canvas.height = 600;

  // Function to get accurate mouse coordinates relative to canvas
  function getMousePos(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width; // Adjust for CSS scaling
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }

  async function loadMetadata() {
    console.log('Loading metadata');
    try {
      metadata = await ipcRenderer.invoke('load-metadata', notebookDir);
      console.log('Metadata loaded:', metadata);
      updatePageSelector();
      loadPage(currentPage);
    } catch (err) {
      console.error('Error loading metadata:', err);
      alert(`Error loading metadata: ${err.message}`);
    }
  }

  function updatePageSelector() {
    console.log('Updating page selector');
    const pageSelector = document.getElementById('pageSelector');
    pageSelector.innerHTML = '';
    for (let i = 1; i <= metadata.pages; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = `Page ${i}`;
      pageSelector.appendChild(option);
    }
    pageSelector.value = currentPage;
  }

  function loadPage(page) {
    console.log('Loading page:', page);
    const img = new Image();
    img.src = `${notebookDir}/page${page}.png?${Date.now()}`;
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
    img.onerror = () => {
      console.log(`Page ${page} not found, initializing empty`);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }

  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;

  canvas.addEventListener('mousedown', (e) => {
    isDrawing = true;
    const pos = getMousePos(e);
    [lastX, lastY] = [pos.x, pos.y];
    console.log('Mouse down at:', pos.x, pos.y);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDrawing) {
      const pos = getMousePos(e);
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = document.getElementById('colorPicker').value;
      ctx.lineWidth = document.getElementById('lineThickness').value;
      ctx.stroke();
      [lastX, lastY] = [pos.x, pos.y];
      console.log('Drawing to:', pos.x, pos.y);
    }
  });

  canvas.addEventListener('mouseup', () => {
    isDrawing = false;
  });

  canvas.addEventListener('mouseout', () => {
    isDrawing = false;
  });

  document.getElementById('colorPicker').addEventListener('change', (e) => {
    ctx.strokeStyle = e.target.value;
  });

  document.getElementById('lineThickness').addEventListener('input', (e) => {
    ctx.lineWidth = e.target.value;
  });

  document.getElementById('clearButton').addEventListener('click', () => {
    console.log('Clearing canvas');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  document.getElementById('addPage').addEventListener('click', async () => {
    console.log('Adding page');
    try {
      metadata.pages += 1;
      await ipcRenderer.invoke('save-notebook', notebookDir, metadata, pageImages);
      currentPage = metadata.pages;
      updatePageSelector();
      loadPage(currentPage);
    } catch (err) {
      console.error('Error adding page:', err);
      alert(`Error adding page: ${err.message}`);
    }
  });

  document.getElementById('pageSelector').addEventListener('change', (e) => {
    console.log('Changing page to:', e.target.value);
    pageImages[currentPage - 1] = canvas.toDataURL();
    currentPage = parseInt(e.target.value);
    loadPage(currentPage);
  });

  document.getElementById('saveNotebook').addEventListener('click', async () => {
    console.log('Saving notebook');
    try {
      pageImages[currentPage - 1] = canvas.toDataURL();
      await ipcRenderer.invoke('save-notebook', notebookDir, metadata, pageImages);
      alert('Notebook saved');
    } catch (err) {
      console.error('Error saving notebook:', err);
      alert(`Error saving notebook: ${err.message}`);
    }
  });

  document.getElementById('exportPdf').addEventListener('click', async () => {
    console.log('Exporting PDF');
    try {
      pageImages[currentPage - 1] = canvas.toDataURL();
      const doc = new jsPDF();
      for (let i = 1; i <= metadata.pages; i++) {
        if (i > 1) doc.addPage();
        const imgData = pageImages[i - 1] || `${notebookDir}/page${i}.png?${Date.now()}`;
        doc.addImage(imgData, 'PNG', 10, 10, 190, 142);
      }
      doc.save(`${metadata.name}.pdf`);
    } catch (err) {
      console.error('Error exporting PDF:', err);
      alert(`Error exporting PDF: ${err.message}`);
    }
  });

  // Back button handler
  document.getElementById('backButton').addEventListener('click', async () => {
    console.log('Back button clicked');
    try {
      // Save the current page before going back
      pageImages[currentPage - 1] = canvas.toDataURL();
      await ipcRenderer.invoke('save-notebook', notebookDir, metadata, pageImages);
      // Notify main process to show homepage
      await ipcRenderer.invoke('show-homepage');
      // Close the current notebook window
      ipcRenderer.send('close-notebook-window');
    } catch (err) {
      console.error('Error handling back button:', err);
      alert(`Error returning to homepage: ${err.message}`);
    }
  });

  loadMetadata();
} catch (err) {
  console.error('Renderer notebook error:', err);
  document.body.innerHTML = '<h1>Error: Renderer failed to initialize</h1><p>' + err.message + '</p>';
}