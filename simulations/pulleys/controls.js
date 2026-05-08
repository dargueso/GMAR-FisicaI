// poleas/controls.js

window.addEventListener('load', () => {

  function bind(id, key, min = null) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = state[key];
    el.addEventListener('input', () => {
      let v = parseFloat(el.value);
      if (!Number.isFinite(v)) return;
      if (min !== null) v = Math.max(min, v);
      state[key]        = v;
      state.data        = null;
      state.animElapsed = 0;
      state.animRunning = false;
      rerender();
    });
  }

  bind('inp-m1', 'm1',      0.01);
  bind('inp-m2', 'm2',      0.01);
  bind('inp-g',  'g',       0.01);
  bind('inp-pM', 'pulley_M', 0.01);
  bind('inp-pR', 'pulley_R', 0.01);

  // ── Mode toggle ──
  function setMode(massive) {
    state.massivePulley = massive;
    state.data          = null;
    state.animElapsed   = 0;
    state.animRunning   = false;

    document.getElementById('btn-massless').classList.toggle('active', !massive);
    document.getElementById('btn-massive' ).classList.toggle('active',  massive);

    document.getElementById('ctrl-pulley'   ).style.display = massive ? '' : 'none';
    document.getElementById('stats-massless').style.display = massive ? 'none' : '';
    document.getElementById('stats-massive' ).style.display = massive ? '' : 'none';
    document.getElementById('eq-massless'   ).style.display = massive ? 'none' : '';
    document.getElementById('eq-massive'    ).style.display = massive ? '' : 'none';

    rerender();
  }

  document.getElementById('btn-massless').addEventListener('click', () => setMode(false));
  document.getElementById('btn-massive' ).addEventListener('click', () => setMode(true));

  document.getElementById('btn-launch').addEventListener('click', launch);
  document.getElementById('btn-pause' ).addEventListener('click', togglePause);
  document.getElementById('btn-clear' ).addEventListener('click', clearAll);

  document.querySelectorAll('.ctrl-inputs input[type=number]').forEach(el =>
    el.addEventListener('keydown', e => { if (e.key === 'Enter') launch(); })
  );
});
