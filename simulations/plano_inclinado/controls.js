// controls.js

window.addEventListener('load', () => {

  function bindNumber(id, key, min, max) {
    const el = document.getElementById(id);
    el.value = state[key];
    el.addEventListener('input', () => {
      let v = parseFloat(el.value);
      if (!Number.isFinite(v)) return;
      if (min != null) v = Math.max(min, v);
      if (max != null) v = Math.min(max, v);
      state[key] = v;
      rerender();
    });
  }

  bindNumber('inp-m',     'm',     0.01, null);
  bindNumber('inp-angle', 'angle', 0,    89);
  bindNumber('inp-mu',    'mu',    0,    null);
  bindNumber('inp-g',     'g',     0.01, null);

  document.getElementById('btn-start').addEventListener('click', startSim);
  document.getElementById('btn-pause').addEventListener('click', togglePause);
  document.getElementById('btn-reset').addEventListener('click', resetSim);

  document.getElementById('btn-decomp').addEventListener('click', () => {
    state.showDecomp = !state.showDecomp;
    document.getElementById('btn-decomp').classList.toggle('active', state.showDecomp);
    rerender();
  });

  document.querySelectorAll('.controls input[type=number]').forEach(el => {
    el.addEventListener('keydown', e => { if (e.key === 'Enter') startSim(); });
  });
});
