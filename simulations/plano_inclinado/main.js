// main.js

const state = {
  m:          2.0,   // kg
  angle:      30,    // degrees
  mu:         0.20,  // friction coefficient
  g:          9.81,  // m/s²
  showDecomp: false,
  s_pos:      3.5,   // position along slope from bottom (m); slope = 4 m
  s_vel:      0,     // velocity along slope (positive = moving up, negative = moving down)
  running:    false,
  paused:     false,
  theta:      0,
  phys:       null,
};

const SLOPE_M   = 4.0;
const BLK_M     = 0.28;
const S_INITIAL = 3.5;

let g_canvas;
let g_animRunning  = false;
let g_animLastTime = null;

function updatePhysics() {
  state.theta = state.angle * Math.PI / 180;
  state.phys  = computePhysics(state.m, state.angle, state.mu, state.g);
}

function rerender() {
  updatePhysics();
  render(g_canvas, state);
  updateStats();
}

function updateStats() {
  const p = state.phys;
  document.getElementById('stat-W'    ).textContent = p.W.toFixed(2)      + ' N';
  document.getElementById('stat-N'    ).textContent = p.N.toFixed(2)      + ' N';
  document.getElementById('stat-f'    ).textContent = p.f.toFixed(2)      + ' N';
  document.getElementById('stat-Wpar' ).textContent = p.W_par.toFixed(2)  + ' N';
  document.getElementById('stat-Wperp').textContent = p.W_perp.toFixed(2) + ' N';
  document.getElementById('stat-a'    ).textContent = p.a.toFixed(2)      + ' m/s²';
  document.getElementById('stat-state').textContent = p.sliding ? 'Deslizando ↓' : 'En reposo';
}

// ---- Simulation control ----

function startSim() {
  updatePhysics();
  state.s_pos   = S_INITIAL;
  state.s_vel   = 0;
  state.running = true;
  state.paused  = false;
  document.getElementById('btn-pause').textContent = 'Pausar';
  startAnimLoop();
  rerender();
}

function togglePause() {
  if (!state.running) return;
  state.paused = !state.paused;
  document.getElementById('btn-pause').textContent = state.paused ? 'Reanudar' : 'Pausar';
  if (!state.paused) startAnimLoop();
  else render(g_canvas, state);
}

function resetSim() {
  g_animRunning  = false;
  state.s_pos    = S_INITIAL;
  state.s_vel    = 0;
  state.running  = false;
  state.paused   = false;
  document.getElementById('btn-pause').textContent = 'Pausar';
  rerender();
}

// ---- Animation loop ----

function startAnimLoop() {
  if (g_animRunning) return;
  g_animRunning  = true;
  g_animLastTime = null;
  requestAnimationFrame(animTick);
}

function animTick(timestamp) {
  if (!g_animRunning) return;
  if (state.paused || !state.running) { g_animRunning = false; return; }

  if (g_animLastTime === null) g_animLastTime = timestamp;
  const dt = Math.min((timestamp - g_animLastTime) / 1000, 0.05);
  g_animLastTime = timestamp;

  if (state.phys.sliding) {
    // a > 0 means net force down the slope → s_vel becomes negative (moving toward bottom)
    state.s_vel -= state.phys.a * dt;
    state.s_pos += state.s_vel * dt;

    if (state.s_pos <= BLK_M / 2 + 0.01) {
      state.s_pos = BLK_M / 2 + 0.01;
      state.s_vel = 0;
      state.running = false;
      g_animRunning = false;
      render(g_canvas, state);
      return;
    }
  } else {
    // Static — no movement, stop the loop
    state.running = false;
    g_animRunning = false;
    render(g_canvas, state);
    return;
  }

  render(g_canvas, state);
  requestAnimationFrame(animTick);
}

// ---- Init ----

function initAll() {
  g_canvas = document.getElementById('canvas');
  updatePhysics();
  new ResizeObserver(rerender).observe(g_canvas.parentElement);
  if (window.matchMedia)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', rerender);
  rerender();
}

window.state       = state;
window.rerender    = rerender;
window.startSim    = startSim;
window.togglePause = togglePause;
window.resetSim    = resetSim;

window.addEventListener('load', initAll);
