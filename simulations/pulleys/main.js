// poleas/main.js

const state = {
  m1: 1.0,
  m2: 2.0,
  g:  9.81,

  massivePulley: false,
  pulley_M: 1.0,
  pulley_R: 0.1,

  data:        null,
  animElapsed: 0,
  animRunning: false,
  paused:      false,
};

let g_canvasScene, g_canvasGraph;
let g_animLastTime = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pulleyMR() {
  return state.massivePulley
    ? { M: state.pulley_M, R: state.pulley_R }
    : { M: 0, R: 0 };
}

// ─── Rendering ───────────────────────────────────────────────────────────────

function currentData() {
  if (!state.data) {
    const { M, R } = pulleyMR();
    state.data = sampleAtwood(state.m1, state.m2, state.g, M, R);
  }
  return state.data;
}

function rerender() {
  const data    = currentData();
  const d       = getD(data, state.animElapsed);
  const { M, R } = pulleyMR();
  renderAtwoodScene(g_canvasScene, d, state.m1, state.m2, state.g, M, R);
  renderAtwoodGraph(g_canvasGraph, data, state.animElapsed);
  updateStats(data);
}

function getD(data, elapsed) {
  if (!data || data.tEnd <= 0) return 0;
  const t = Math.max(0, Math.min(data.tEnd, elapsed));
  return 0.5 * data.a * t * t;
}

function updateStats(data) {
  const fmt  = (x, unit) => Number.isFinite(x) ? x.toFixed(3) + ' ' + unit : '—';
  const fmtA = x => fmt(Math.abs(x), 'm/s²') + (Math.abs(x) < 1e-6 ? '' : (x > 0 ? '  (m₂↓)' : '  (m₁↓)'));

  if (state.massivePulley) {
    document.getElementById('mv-a' ).textContent = fmtA(data.a);
    document.getElementById('mv-T1').textContent = fmt(data.T1, 'N');
    document.getElementById('mv-T2').textContent = fmt(data.T2, 'N');
    document.getElementById('mv-W1').textContent = fmt(data.W1, 'N');
    document.getElementById('mv-W2').textContent = fmt(data.W2, 'N');
    document.getElementById('mv-I' ).textContent = fmt(data.I,  'kg·m²');
  } else {
    document.getElementById('ml-a' ).textContent = fmtA(data.a);
    document.getElementById('ml-T' ).textContent = fmt(data.T1, 'N');
    document.getElementById('ml-W1').textContent = fmt(data.W1, 'N');
    document.getElementById('ml-W2').textContent = fmt(data.W2, 'N');
  }
}

// ─── Launch / controls ───────────────────────────────────────────────────────

function launch() {
  const { M, R } = pulleyMR();
  state.data        = sampleAtwood(state.m1, state.m2, state.g, M, R);
  state.animElapsed = 0;
  state.paused      = false;
  updatePauseBtn();
  if (state.data.tEnd > 0) startAnimLoop();
  rerender();
}

function clearAll() {
  state.animRunning = false;
  state.animElapsed = 0;
  const { M, R } = pulleyMR();
  state.data  = sampleAtwood(state.m1, state.m2, state.g, M, R);
  state.paused = false;
  updatePauseBtn();
  rerender();
}

function togglePause() {
  state.paused = !state.paused;
  updatePauseBtn();
  if (!state.paused) startAnimLoop();
  rerender();
}

function updatePauseBtn() {
  const el = document.getElementById('btn-pause');
  if (el) el.textContent = state.paused ? 'Resume' : 'Pause';
}

// ─── Animation loop ──────────────────────────────────────────────────────────

function startAnimLoop() {
  if (state.animRunning) return;
  state.animRunning = true;
  g_animLastTime    = null;
  requestAnimationFrame(animTick);
}

function animTick(timestamp) {
  if (!state.animRunning) return;
  if (state.paused) { state.animRunning = false; return; }
  if (g_animLastTime === null) g_animLastTime = timestamp;

  const dt = (timestamp - g_animLastTime) / 1000;
  g_animLastTime = timestamp;

  const data = currentData();
  if (data.tEnd > 0 && state.animElapsed < data.tEnd) {
    state.animElapsed = Math.min(data.tEnd, state.animElapsed + dt);
  }

  rerender();

  if (data.tEnd > 0 && state.animElapsed < data.tEnd) {
    requestAnimationFrame(animTick);
  } else {
    state.animRunning = false;
  }
}

// ─── Init ────────────────────────────────────────────────────────────────────

function initAll() {
  g_canvasScene = document.getElementById('canvas-scene');
  g_canvasGraph = document.getElementById('canvas-graph');

  const obs = new ResizeObserver(rerender);
  obs.observe(g_canvasScene.parentElement);
  obs.observe(g_canvasGraph.parentElement);

  if (window.matchMedia)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', rerender);

  clearAll();
}

window.state       = state;
window.launch      = launch;
window.clearAll    = clearAll;
window.togglePause = togglePause;
window.rerender    = rerender;

window.addEventListener('load', initAll);
