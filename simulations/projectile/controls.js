// simulations/projectile/controls.js

window.addEventListener('load', () => {

  function bindNumber(id, key, parser = parseFloat) {
    const el = document.getElementById(id);
    el.value = state[key];
    el.addEventListener('input', () => {
      const v = parser(el.value);
      if (Number.isFinite(v)) {
        state[key] = v;
        rerender();
      }
    });
  }

  bindNumber('inp-v0',    'v0');
  bindNumber('inp-angle', 'angle');
  bindNumber('inp-g',     'g');
  bindNumber('inp-h0',    'h0');

  document.getElementById('btn-launch').addEventListener('click', launch);
  document.getElementById('btn-clear' ).addEventListener('click', clearAll);
  document.getElementById('btn-pause' ).addEventListener('click', togglePause);

  // Vector toggles (independent on/off).
  function bindToggle(btnId, key) {
    const btn = document.getElementById(btnId);
    btn.addEventListener('click', () => {
      state[key] = !state[key];
      btn.classList.toggle('active', state[key]);
      redraw();
    });
  }
  bindToggle('btn-show-v',  'showV');
  bindToggle('btn-show-vx', 'showVx');
  bindToggle('btn-show-vy', 'showVy');

  // Enter on any input → launch.
  document.querySelectorAll('.controls input[type=number]').forEach(el => {
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') launch(); });
  });
});
