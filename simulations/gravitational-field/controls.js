// campo_gravitatorio/controls.js

window.addEventListener('load', () => {
  const sel = document.getElementById('sel-planet');

  PLANETS.forEach((p, i) => {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = p.name;
    sel.appendChild(opt);
  });
  sel.value = state.planetIdx;

  sel.addEventListener('change', () => {
    state.planetIdx = parseInt(sel.value, 10);
    state.hoverR    = null;
    rerender();
  });
});
