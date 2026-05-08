// campo_gravitatorio/main.js

const state = {
  planetIdx: 0,
  hoverR:    null,
};

let g_canvasSphere, g_canvasG, g_canvasV;

function currentPlanet() {
  return PLANETS[state.planetIdx];
}

function rerender() {
  const { M, R } = currentPlanet();
  const pts = sampleGravity(M, R);
  renderSphere(g_canvasSphere, M, R, state.hoverR);
  renderGField(g_canvasG, M, R, pts, state.hoverR);
  renderVPotential(g_canvasV, M, R, pts, state.hoverR);
  updateStats(M, R);
}

function updateStats(M, R) {
  const gSurf = G * M / (R * R);
  const vSurf = -G * M / R;
  const vCent = -1.5 * G * M / R;

  document.getElementById('stat-mass'  ).textContent = fmtMass(M);
  document.getElementById('stat-radius').textContent = fmtKm(R);
  document.getElementById('stat-g-surf').textContent = fmtVal(gSurf) + ' m/s²';
  document.getElementById('stat-v-surf').textContent = fmtPotential(vSurf);
  document.getElementById('stat-v-cent').textContent = fmtPotential(vCent);
}

function fmtPotential(v) {
  const a = Math.abs(v);
  if (a >= 1e9) return (v / 1e9).toPrecision(4) + ' GJ/kg';
  if (a >= 1e6) return (v / 1e6).toPrecision(4) + ' MJ/kg';
  if (a >= 1e3) return (v / 1e3).toPrecision(4) + ' kJ/kg';
  return v.toFixed(1) + ' J/kg';
}

function fmtKm(m) {
  const km = m / 1e3;
  if (km >= 1e5) return (km / 1e3).toPrecision(4) + ' × 10³ km';
  return Math.round(km) + ' km';
}

function fmtMass(M) {
  const e = Math.floor(Math.log10(M));
  const m = M / Math.pow(10, e);
  return m.toFixed(3) + ' × 10' + superscript(e) + ' kg';
}

function superscript(n) {
  return String(n).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[parseInt(c)] ?? c).join('');
}

// ─── Hover interaction (shared across all three canvases) ────────────────────

function attachHover(canvas) {
  function onMove(e) {
    const rect  = canvas.getBoundingClientRect();
    const cssX  = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const plotW = rect.width - PAD_L - PAD_R;
    if (plotW <= 0) return;
    const r = ((cssX - PAD_L) / plotW) * X_MAX_R * currentPlanet().R;
    state.hoverR = Math.max(0, Math.min(r, X_MAX_R * currentPlanet().R));
    rerender();
  }
  function onLeave() { state.hoverR = null; rerender(); }

  canvas.addEventListener('mousemove',  onMove);
  canvas.addEventListener('mouseleave', onLeave);
  canvas.addEventListener('touchmove',  e => { e.preventDefault(); onMove(e); }, { passive: false });
  canvas.addEventListener('touchend',   onLeave);
}

// ─── Init ────────────────────────────────────────────────────────────────────

function initAll() {
  g_canvasSphere = document.getElementById('canvas-sphere');
  g_canvasG      = document.getElementById('canvas-g');
  g_canvasV      = document.getElementById('canvas-v');

  attachHover(g_canvasSphere);
  attachHover(g_canvasG);
  attachHover(g_canvasV);

  const obs = new ResizeObserver(rerender);
  [g_canvasSphere, g_canvasG, g_canvasV].forEach(cv => obs.observe(cv.parentElement));

  if (window.matchMedia)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', rerender);

  rerender();
}

window.addEventListener('load', initAll);
window.state         = state;
window.rerender      = rerender;
window.currentPlanet = currentPlanet;
