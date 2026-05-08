// energia/main.js

const state = {
  mode: 'proj',

  // Projectile params
  proj_v0:    20,
  proj_angle: 45,
  proj_g:     9.81,
  proj_h0:    0,
  proj_mass:  1,

  // Inclined plane params
  incl_m:     2.0,
  incl_angle: 30,
  incl_mu:    0.20,
  incl_g:     9.81,
  incl_s0:    S_START,

  // Pendulum params
  pend_m:      1.0,
  pend_L:      1.0,
  pend_theta0: 30,
  pend_g:      9.81,

  // Spring params
  spring_k:   10.0,
  spring_x0:  0.30,
  spring_m:   1.0,
  spring_mu:  0.0,
  spring_g:   9.81,

  // Shared
  trajectories:  [],
  nextColorIdx:  0,
  paused:        false,
};

let g_canvasTraj, g_canvasEnergy;
let g_animRunning  = false;
let g_animLastTime = null;

// ─── Mode switching ───────────────────────────────────────────────────────────

function setMode(mode) {
  state.mode = mode;
  g_animRunning = false;
  state.trajectories = [];
  state.nextColorIdx = 0;
  state.paused       = false;
  updateModeUI();
  rerender();
}

function updateModeUI() {
  const isProj = state.mode === 'proj';
  const isIncl = state.mode === 'incl';
  const isPend   = state.mode === 'pend';
  const isSpring = state.mode === 'spring';
  document.getElementById('ctrl-proj'  ).hidden = !isProj;
  document.getElementById('ctrl-incl'  ).hidden = !isIncl;
  document.getElementById('ctrl-pend'  ).hidden = !isPend;
  document.getElementById('ctrl-spring').hidden = !isSpring;
  document.getElementById('eq-proj'    ).hidden = !isProj;
  document.getElementById('eq-incl'    ).hidden = !isIncl;
  document.getElementById('eq-pend'    ).hidden = !isPend;
  document.getElementById('eq-spring'  ).hidden = !isSpring;
  document.getElementById('btn-mode-proj'  ).classList.toggle('active', isProj);
  document.getElementById('btn-mode-incl'  ).classList.toggle('active', isIncl);
  document.getElementById('btn-mode-pend'  ).classList.toggle('active', isPend);
  document.getElementById('btn-mode-spring').classList.toggle('active', isSpring);
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function previewData() {
  if (state.mode === 'proj') {
    return sampleEnergies(
      state.proj_v0, state.proj_angle, state.proj_g,
      state.proj_h0, state.proj_mass
    );
  }
  if (state.mode === 'incl') {
    return sampleInclined(
      state.incl_m, state.incl_angle, state.incl_mu,
      state.incl_g, state.incl_s0
    );
  }
  if (state.mode === 'pend') {
    return samplePendulum(
      state.pend_m, state.pend_L, state.pend_theta0, state.pend_g
    );
  }
  return sampleSpring(
    state.spring_m, state.spring_k, state.spring_x0, state.spring_mu, state.spring_g
  );
}

function inclParams() {
  return {
    angle: state.incl_angle,
    s0:    state.incl_s0,
    g:     state.incl_g,
    m:     state.incl_m,
  };
}

function pendSceneParams() {
  return {
    theta0: state.pend_theta0 * Math.PI / 180,
    L:      state.pend_L,
    m:      state.pend_m,
    g:      state.pend_g,
  };
}

function springSceneParams() {
  return {
    k:  state.spring_k,
    x0: state.spring_x0,
    m:  state.spring_m,
    mu: state.spring_mu,
    g:  state.spring_g,
  };
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function rerender() {
  redraw();
  updateLiveStats();
  updateLegend();
}

function redraw() {
  const prev = previewData();
  if (state.mode === 'proj') {
    renderTrajectory(g_canvasTraj, state.trajectories, prev);
  } else if (state.mode === 'incl') {
    renderInclinedScene(g_canvasTraj, state.trajectories, inclParams());
  } else if (state.mode === 'pend') {
    renderPendulumScene(g_canvasTraj, state.trajectories, pendSceneParams());
  } else {
    renderSpringScene(g_canvasTraj, state.trajectories, springSceneParams());
  }
  renderCombinedEnergy(g_canvasEnergy, state.trajectories, prev, state.nextColorIdx);
}

function updateLiveStats() {
  if (state.mode === 'proj') {
    const a   = energyAnalytics(
      state.proj_v0, state.proj_angle, state.proj_g,
      state.proj_h0, state.proj_mass
    );
    const fmt = x => Number.isFinite(x) ? x.toFixed(2) + ' J' : '—';
    document.getElementById('stat-em'     ).textContent = fmt(a.Em);
    document.getElementById('stat-ec0'    ).textContent = fmt(a.Ec0);
    document.getElementById('stat-ep0'    ).textContent = fmt(a.Ep0);
    document.getElementById('stat-ec-apex').textContent = fmt(a.EcApex);
    document.getElementById('stat-ep-apex').textContent = fmt(a.EpApex);
  } else if (state.mode === 'incl') {
    const a   = inclinedAnalytics(
      state.incl_m, state.incl_angle, state.incl_mu,
      state.incl_g, state.incl_s0
    );
    const fmtJ = x => Number.isFinite(x) ? x.toFixed(2) + ' J'    : '—';
    const fmtA = x => Number.isFinite(x) ? x.toFixed(2) + ' m/s²' : '—';
    document.getElementById('stat-incl-em0'  ).textContent = fmtJ(a.Em0);
    document.getElementById('stat-incl-ep0'  ).textContent = fmtJ(a.Ep0);
    document.getElementById('stat-incl-ecbot').textContent = fmtJ(a.EcBottom);
    document.getElementById('stat-incl-epbot').textContent = fmtJ(a.EpBottom);
    document.getElementById('stat-incl-a'    ).textContent = fmtA(a.a);
    document.getElementById('stat-incl-state').textContent = a.sliding ? 'Sliding ↓' : 'At rest';
  } else if (state.mode === 'pend') {
    const a    = pendulumAnalytics(
      state.pend_m, state.pend_L, state.pend_theta0, state.pend_g
    );
    const fmtJ = x => Number.isFinite(x) ? x.toFixed(2) + ' J' : '—';
    const fmtS = x => Number.isFinite(x) ? x.toFixed(3) + ' s' : '—';
    document.getElementById('stat-pend-em'   ).textContent = fmtJ(a.Em0);
    document.getElementById('stat-pend-ecmax').textContent = fmtJ(a.EcMax);
    document.getElementById('stat-pend-epmax').textContent = fmtJ(a.EpMax);
    document.getElementById('stat-pend-T'    ).textContent = fmtS(a.T_approx);
  } else {
    const a    = springAnalytics(
      state.spring_m, state.spring_k, state.spring_x0, state.spring_mu, state.spring_g
    );
    const fmtJ = x => Number.isFinite(x) ? x.toFixed(2) + ' J' : '—';
    const fmtS = x => Number.isFinite(x) ? x.toFixed(3) + ' s' : '—';
    document.getElementById('stat-spring-em0'  ).textContent = fmtJ(a.Em0);
    document.getElementById('stat-spring-ecmax').textContent = fmtJ(a.EcMax);
    document.getElementById('stat-spring-T'    ).textContent = fmtS(a.T0);
    document.getElementById('stat-spring-state').textContent =
      !a.sliding ? 'At rest (high μ)' : (state.spring_mu > 1e-9 ? 'Damped' : 'SHM (conservative)');
  }
}

function updateLegend() {
  const ul = document.getElementById('legend-list');
  ul.innerHTML = '';
  state.trajectories.forEach((tr, i) => {
    const li   = document.createElement('li');
    li.className = 'legend-item';
    let paramsHtml;
    if (tr.mode === 'proj') {
      paramsHtml = `v₀=${tr.params.v0} m/s &nbsp;θ=${tr.params.angle}° &nbsp;m=${tr.params.mass} kg &nbsp;h₀=${tr.params.h0} m`;
    } else if (tr.mode === 'incl') {
      paramsHtml = `m=${tr.params.m} kg &nbsp;θ=${tr.params.angle}° &nbsp;μ=${tr.params.mu} &nbsp;s₀=${tr.params.s0} m`;
    } else if (tr.mode === 'pend') {
      paramsHtml = `m=${tr.params.m} kg &nbsp;L=${tr.params.L} m &nbsp;θ₀=${tr.params.theta0}°`;
    } else {
      paramsHtml = `k=${tr.params.k} N/m &nbsp;x₀=${tr.params.x0} m &nbsp;m=${tr.params.m} kg &nbsp;μ=${tr.params.mu}`;
    }
    const Em0 = tr.Em0 ?? tr.Em;
    li.innerHTML = `
      <span class="legend-swatch" style="background:${tr.ecColor}" title="Ec"></span>
      <span class="legend-swatch" style="background:${tr.epColor}" title="Ep"></span>
      <span class="legend-params">${paramsHtml}</span>
      <span class="legend-results">Em₀=${Em0.toFixed(1)} J</span>
      <button class="legend-remove" data-idx="${i}" title="Eliminar">×</button>
    `;
    ul.appendChild(li);
  });
  ul.querySelectorAll('.legend-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      state.trajectories.splice(parseInt(btn.dataset.idx, 10), 1);
      rerender();
    });
  });
}

// ─── Launch ───────────────────────────────────────────────────────────────────

function launch() {
  let tr;
  if (state.mode === 'proj') {
    tr      = sampleEnergies(
      state.proj_v0, state.proj_angle, state.proj_g,
      state.proj_h0, state.proj_mass
    );
    tr.mode   = 'proj';
    tr.params = {
      v0: state.proj_v0, angle: state.proj_angle, g: state.proj_g,
      h0: state.proj_h0, mass: state.proj_mass,
    };
  } else if (state.mode === 'incl') {
    tr      = sampleInclined(
      state.incl_m, state.incl_angle, state.incl_mu,
      state.incl_g, state.incl_s0
    );
    tr.mode   = 'incl';
    tr.params = {
      m: state.incl_m, angle: state.incl_angle, mu: state.incl_mu,
      g: state.incl_g, s0: state.incl_s0,
    };
  } else if (state.mode === 'pend') {
    tr      = samplePendulum(
      state.pend_m, state.pend_L, state.pend_theta0, state.pend_g
    );
    tr.mode   = 'pend';
    tr.params = {
      m: state.pend_m, L: state.pend_L,
      theta0: state.pend_theta0, g: state.pend_g,
    };
  } else {
    tr      = sampleSpring(
      state.spring_m, state.spring_k, state.spring_x0, state.spring_mu, state.spring_g
    );
    tr.mode   = 'spring';
    tr.params = {
      k: state.spring_k, x0: state.spring_x0,
      m: state.spring_m, mu: state.spring_mu, g: state.spring_g,
    };
  }

  const [ec, ep]   = colorsFor(state.nextColorIdx);
  tr.ecColor       = ec;
  tr.epColor       = ep;
  tr.animElapsed   = 0;
  state.nextColorIdx++;
  state.trajectories.push(tr);

  if (!state.paused) startAnimLoop();
  rerender();
}

// ─── Animation loop ───────────────────────────────────────────────────────────

function togglePause() {
  state.paused = !state.paused;
  const text = state.paused ? 'Resume' : 'Pause';
  ['btn-pause', 'btn-incl-pause', 'btn-pend-pause', 'btn-spring-pause'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  });
  if (!state.paused) startAnimLoop();
  redraw();
}

function clearAll() {
  state.trajectories = [];
  state.nextColorIdx = 0;
  rerender();
}

function startAnimLoop() {
  if (g_animRunning) return;
  g_animRunning  = true;
  g_animLastTime = null;
  requestAnimationFrame(animTick);
}

function animTick(timestamp) {
  if (!g_animRunning) return;
  if (state.paused) { g_animRunning = false; return; }
  if (g_animLastTime === null) g_animLastTime = timestamp;
  const dt = (timestamp - g_animLastTime) / 1000;
  g_animLastTime = timestamp;

  let anyAnimating = false;
  for (const tr of state.trajectories) {
    if (tr.loop) {
      tr.animElapsed += dt;
      anyAnimating = true;
    } else if (tr.animElapsed < tr.tEnd) {
      tr.animElapsed = Math.min(tr.tEnd, tr.animElapsed + dt);
      if (tr.animElapsed < tr.tEnd) anyAnimating = true;
    }
  }

  redraw();

  if (anyAnimating) requestAnimationFrame(animTick);
  else              g_animRunning = false;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function initAll() {
  g_canvasTraj   = document.getElementById('canvas-traj');
  g_canvasEnergy = document.getElementById('canvas-energy');

  const obs = new ResizeObserver(rerender);
  obs.observe(g_canvasTraj.parentElement);
  obs.observe(g_canvasEnergy.parentElement);

  if (window.matchMedia)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', rerender);

  updateModeUI();
  rerender();
}

window.state          = state;
window.launch         = launch;
window.clearAll       = clearAll;
window.rerender       = rerender;
window.setMode        = setMode;
window.togglePause    = togglePause;
window.pendSceneParams   = pendSceneParams;
window.springSceneParams = springSceneParams;

window.addEventListener('load', initAll);
