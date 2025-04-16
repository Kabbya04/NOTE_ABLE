const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');
const colorPicker = document.getElementById('colorPicker');
const clearButton = document.getElementById('clearButton');

let isDrawing = false;
let lastX = 0;
let lastY = 0;

// Set initial canvas styles
ctx.lineJoin = 'round';
ctx.lineCap = 'round';
ctx.lineWidth = lineThickness.value; // Use initial dropdown value

// Start drawing
function startDrawing(e) {
  isDrawing = true;
  [lastX, lastY] = [e.offsetX, e.offsetY];
}

// Draw on canvas
function draw(e) {
  if (!isDrawing) return;

  ctx.lineWidth = lineThickness.value; // Use selected thickness
  ctx.strokeStyle = colorPicker.value;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(e.offsetX, e.offsetY);
  ctx.stroke();

  [lastX, lastY] = [e.offsetX, e.offsetY];
}

// Stop drawing
function stopDrawing() {
  isDrawing = false;
}

// Clear canvas
function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Event listeners for pointer events (supports mouse and graphics tablets)
canvas.addEventListener('pointerdown', startDrawing);
canvas.addEventListener('pointermove', draw);
canvas.addEventListener('pointerup', stopDrawing);
canvas.addEventListener('pointerout', stopDrawing);

// Prevent context menu on canvas for better drawing experience
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// Clear button
clearButton.addEventListener('click', clearCanvas);

// Update line width when thickness is changed
lineThickness.addEventListener('change', () => {
    ctx.lineWidth = lineThickness.value;
  });