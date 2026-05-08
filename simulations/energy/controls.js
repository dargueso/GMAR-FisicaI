// energia/controls.js

window.addEventListener('load', () => {

  // ── Mode toggle ────────────────────────────────────────────────────────────
  document.getElementById('btn-mode-proj').addEventListener('click', () => setMode('proj'));
  document.getElementById('btn-mode-incl').addEventListener('click', () => setMode('incl'));
  document.getElementById('btn-mode-pend'  ).addEventListener('click', () => setMode('pend'));
  document.getElementById('btn-mode-spring').addEventListener('click', () => setMode('spring'));

  // ── Projectile inputs ──────────────────────────────────────────────────────
  function bindProj(id, key) {
    const el = document.getElementById(id);
    el.value = state[key];
    el.addEventListener('input', () => {
      const v = parseFloat(el.value);
      if (Number.isFinite(v)) { state[key] = v; rerender(); }
    });
  }
  bindProj('inp-v0',    'proj_v0');
  bindProj('inp-angle', 'proj_angle');
  bindProj('inp-g',     'proj_g');
  bindProj('inp-h0',    'proj_h0');
  bindProj('inp-mass',  'proj_mass');

  document.getElementById('btn-launch').addEventListener('click', launch);
  document.getElementById('btn-pause' ).addEventListener('click', togglePause);
  document.getElementById('btn-clear' ).addEventListener('click', clearAll);

  document.querySelectorAll('#ctrl-proj input[type=number]').forEach(el =>
    el.addEventListener('keydown', e => { if (e.key === 'Enter') launch(); })
  );

  // ── Inclined plane inputs ──────────────────────────────────────────────────
  function bindIncl(id, key, min = null) {
    const el = document.getElementById(id);
    el.value = state[key];
    el.addEventListener('input', () => {
      let v = parseFloat(el.value);
      if (!Number.isFinite(v)) return;
      if (min !== null) v = Math.max(min, v);
      state[key] = v;
      rerender();
    });
  }
  bindIncl('inp-incl-m',     'incl_m',     0.01);
  bindIncl('inp-incl-angle', 'incl_angle', 0);
  bindIncl('inp-incl-mu',    'incl_mu',    0);
  bindIncl('inp-incl-g',     'incl_g',     0.01);
  bindIncl('inp-incl-s0',    'incl_s0',    0.2);

  document.getElementById('btn-incl-launch').addEventListener('click', launch);
  document.getElementById('btn-incl-pause' ).addEventListener('click', togglePause);
  document.getElementById('btn-incl-clear' ).addEventListener('click', clearAll);

  document.querySelectorAll('#ctrl-incl input[type=number]').forEach(el =>
    el.addEventListener('keydown', e => { if (e.key === 'Enter') launch(); })
  );

  // ── Pendulum inputs ────────────────────────────────────────────────────────
  function bindPend(id, key, min = null) {
    const el = document.getElementById(id);
    el.value = state[key];
    el.addEventListener('input', () => {
      let v = parseFloat(el.value);
      if (!Number.isFinite(v)) return;
      if (min !== null) v = Math.max(min, v);
      state[key] = v;
      rerender();
    });
  }
  bindPend('inp-pend-m',      'pend_m',      0.01);
  bindPend('inp-pend-L',      'pend_L',      0.1);
  bindPend('inp-pend-theta0', 'pend_theta0', 0);
  bindPend('inp-pend-g',      'pend_g',      0.01);

  document.getElementById('btn-pend-launch').addEventListener('click', launch);
  document.getElementById('btn-pend-pause' ).addEventListener('click', togglePause);
  document.getElementById('btn-pend-clear' ).addEventListener('click', clearAll);

  document.querySelectorAll('#ctrl-pend input[type=number]').forEach(el =>
    el.addEventListener('keydown', e => { if (e.key === 'Enter') launch(); })
  );

  // ── Spring inputs ──────────────────────────────────────────────────────────
  function bindSpring(id, key, min = null) {
    const el = document.getElementById(id);
    el.value = state[key];
    el.addEventListener('input', () => {
      let v = parseFloat(el.value);
      if (!Number.isFinite(v)) return;
      if (min !== null) v = Math.max(min, v);
      state[key] = v;
      rerender();
    });
  }
  bindSpring('inp-spring-k',   'spring_k',   0.1);
  bindSpring('inp-spring-x0',  'spring_x0',  0.01);
  bindSpring('inp-spring-m',   'spring_m',   0.01);
  bindSpring('inp-spring-mu',  'spring_mu',  0);
  bindSpring('inp-spring-g',   'spring_g',   0.01);

  document.getElementById('btn-spring-launch').addEventListener('click', launch);
  document.getElementById('btn-spring-pause' ).addEventListener('click', togglePause);
  document.getElementById('btn-spring-clear' ).addEventListener('click', clearAll);

  document.querySelectorAll('#ctrl-spring input[type=number]').forEach(el =>
    el.addEventListener('keydown', e => { if (e.key === 'Enter') launch(); })
  );
});
