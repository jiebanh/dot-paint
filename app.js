(function () {
  'use strict';

  const GRID_WIDTH = 16;
  const GRID_HEIGHT = 16;

  const { createModel, setPixel, setPaletteColor, addPaletteColor } = window.paintModel;

  const model = createModel(GRID_WIDTH, GRID_HEIGHT);
  let selectedPaletteIndex = 0;

  const gridEl = document.getElementById('grid');
  const paletteEl = document.getElementById('palette');
  const addColorButton = document.getElementById('add-color');

  const dotEls = [];

  function buildGrid() {
    for (let y = 0; y < model.height; y += 1) {
      for (let x = 0; x < model.width; x += 1) {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'dot';
        dot.setAttribute('aria-label', `dot (${x}, ${y})`);
        dot.addEventListener('click', () => {
          setPixel(model, x, y, selectedPaletteIndex);
          renderGrid();
        });
        gridEl.appendChild(dot);
        dotEls.push(dot);
      }
    }
  }

  function renderGrid() {
    for (let i = 0; i < model.pixels.length; i += 1) {
      dotEls[i].style.backgroundColor = model.palette[model.pixels[i]];
    }
  }

  function buildPalette() {
    paletteEl.innerHTML = '';
    model.palette.forEach((color, index) => {
      const li = document.createElement('li');

      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'swatch' + (index === selectedPaletteIndex ? ' selected' : '');
      swatch.style.backgroundColor = color;
      swatch.setAttribute('aria-label', `select palette color ${index}`);
      swatch.addEventListener('click', () => {
        selectedPaletteIndex = index;
        buildPalette();
      });

      const colorInput = document.createElement('input');
      colorInput.type = 'color';
      colorInput.className = 'swatch-color-input';
      colorInput.value = color;
      colorInput.setAttribute('aria-label', `edit palette color ${index}`);
      colorInput.addEventListener('input', (event) => {
        setPaletteColor(model, index, event.target.value);
        swatch.style.backgroundColor = event.target.value;
        renderGrid();
      });

      li.appendChild(swatch);
      li.appendChild(colorInput);
      paletteEl.appendChild(li);
    });
  }

  addColorButton.addEventListener('click', () => {
    addPaletteColor(model, '#808080');
    buildPalette();
  });

  buildGrid();
  buildPalette();
  renderGrid();
})();
