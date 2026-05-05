// simulations/solar-system/main.js
//
// Animation loop, rendering, and UI wiring for the Sun + 8 planets + Moon
// simulation. Defaults give a stable hierarchical orbit. Each slider live-
// re-initialises the system from the current parameter values; clicking a
// row label in the parameter grid toggles that body on/off.

const TRAIL_MAX = 1200;

const state = {
  params:    { ...DEFAULT_PARAMS },
  bodies:    [],
  t:         0,
  // With realistic masses (M_sun = 333 000 M⊕) orbital velocities are
  // ~18× faster than the old normalised system, so a time scale of 2
  // gives a comfortable ~15 s Earth year and ~1 s Moon orbit.
  timeScale: 2,
  running:   false,    // start paused so the user can configure bodies first
  // Manual camera: zoom multiplies the auto-fit scale, pan shifts the canvas
  // origin in pixels. Both are reset by the Reset button or double-click.
  zoom:      1.0,
  panX:      0,
  panY:      0,
};

// Slider config table — drives both the parameter grid layout and the
// param->slider binding. `null` cells are rendered as dashes (e.g. the Sun
// has no orbit so its Distance/Speed cells are blank).
//   [paramKey, min, max, step]
// Slider ranges. Masses are in Earth masses (M⊕); distances are in sim
// units (Earth = 200 = 1 AU). Mass ranges intentionally span 3–4 orders of
// magnitude per body so students can explore extreme cases — e.g. drop the
// Sun to a brown-dwarf, blow Jupiter up to a stellar mass, or compare a
// sub-Mercury Earth.
const PARAM_TABLE = [
  { name: 'Sun',     mass: ['sunMass',      1000, 10000000, 1000  ], dist: null,                                speed: null                              },
  { name: 'Mercury', mass: ['mercuryMass',  0.001,       5, 0.001 ], dist: ['mercuryRadius',  30,   200,  1   ], speed: ['mercurySpeed', 0.5, 1.5, 0.01] },
  { name: 'Venus',   mass: ['venusMass',     0.01,      20, 0.01  ], dist: ['venusRadius',    60,   250,  1   ], speed: ['venusSpeed',   0.5, 1.5, 0.01] },
  { name: 'Earth',   mass: ['earthMass',      0.1,    1000, 0.1   ], dist: ['earthRadius',   100,   400,  1   ], speed: ['earthSpeed',   0.5, 1.5, 0.01] },
  { name: 'Moon',    mass: ['moonMass',     0.001,      10, 0.001 ], dist: ['moonRadius',    0.5,     5, 0.05 ], speed: ['moonSpeed',    0.5, 1.5, 0.01] },
  { name: 'Mars',    mass: ['marsMass',      0.01,      20, 0.005 ], dist: ['marsRadius',    200,   500,  1   ], speed: ['marsSpeed',    0.5, 1.5, 0.01] },
  { name: 'Jupiter', mass: ['jupiterMass',      1,   10000, 1     ], dist: ['jupiterRadius', 600,  1500,  5   ], speed: ['jupiterSpeed', 0.5, 1.5, 0.01] },
  { name: 'Saturn',  mass: ['saturnMass',       1,    5000, 1     ], dist: ['saturnRadius', 1500,  2500,  5   ], speed: ['saturnSpeed',  0.5, 1.5, 0.01] },
  { name: 'Uranus',  mass: ['uranusMass',     0.1,    1000, 0.1   ], dist: ['uranusRadius', 3000,  5000,  5   ], speed: ['uranusSpeed',  0.5, 1.5, 0.01] },
  { name: 'Neptune', mass: ['neptuneMass',    0.1,    1000, 0.1   ], dist: ['neptuneRadius', 5000, 8000,  5   ], speed: ['neptuneSpeed', 0.5, 1.5, 0.01] },
];

let canvas, ctx;

function init() {
  canvas = document.getElementById('canvas2d');
  ctx    = canvas.getContext('2d');
  resize();
  applyParams(false);
  buildControls();
  attachCameraEvents();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  canvas.width  = Math.round(rect.width);
  canvas.height = Math.round(rect.height);
}

// Re-initialise body positions/velocities from current params.
// preserveActive=true keeps each body's on/off toggle state across edits;
// the active set is passed into buildBodies so velocities are computed in
// the actual gravitational field of just the bodies that will be simulated.
function applyParams(preserveActive = true) {
  let activeNames = null;
  if (preserveActive && state.bodies.length) {
    activeNames = new Set(state.bodies.filter(b => b.active).map(b => b.name));
  }
  state.bodies = buildBodies(state.params, activeNames);
  state.t = 0;
}

function reset() {
  state.params = { ...DEFAULT_PARAMS };
  applyParams(false);
  state.running = false;     // stay paused so the user can reconfigure
  state.zoom = 1.0;          // restore the auto-fit camera too
  state.panX = state.panY = 0;
  buildControls();
}

// ── Camera interaction (wheel zoom + drag pan + dbl-click reset) ───────────

function attachCameraEvents() {
  // Mouse-wheel zoom centred on cursor: keep the world point under the
  // cursor fixed across the zoom step.
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom = Math.max(0.05, Math.min(50, state.zoom * factor));
    if (newZoom === state.zoom) return;
    updateCamera();
    const worldX = (mx - state.cx) / state.scale;
    const worldY = (my - state.cy) / state.scale;
    state.zoom = newZoom;
    updateCamera();
    state.panX += mx - (state.cx + worldX * state.scale);
    state.panY += my - (state.cy + worldY * state.scale);
  }, { passive: false });

  // Click-drag pan. Don't start a pan if the user clicked on a body — at
  // the moment there's no body interaction, but if we ever add one this
  // keeps it from fighting.
  let dragging = false;
  let lastX = 0, lastY = 0;
  const onDown = (x, y) => { dragging = true; lastX = x; lastY = y; canvas.style.cursor = 'grabbing'; };
  const onMove = (x, y) => {
    if (!dragging) return;
    state.panX += (x - lastX);
    state.panY += (y - lastY);
    lastX = x; lastY = y;
  };
  const onUp = () => { dragging = false; canvas.style.cursor = 'grab'; };
  function pos(e) {
    const r = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return [t.clientX - r.left, t.clientY - r.top];
  }
  canvas.addEventListener('mousedown',  e => onDown(...pos(e)));
  window.addEventListener('mousemove',  e => onMove(...pos(e)));
  window.addEventListener('mouseup',    onUp);
  canvas.addEventListener('touchstart', e => { e.preventDefault(); onDown(...pos(e)); }, { passive: false });
  canvas.addEventListener('touchmove',  e => { e.preventDefault(); onMove(...pos(e)); }, { passive: false });
  canvas.addEventListener('touchend',   onUp);

  // Double-click resets only the camera (not the simulation).
  canvas.addEventListener('dblclick', () => {
    state.zoom = 1.0;
    state.panX = state.panY = 0;
  });

  canvas.style.cursor = 'grab';
}

function setActive(name, on) {
  const b = state.bodies.find(b => b.name === name);
  if (!b) return;
  b.active = on;
  if (!on) b.trail = [];
  // Re-derive every active body's circular velocity in the new field —
  // otherwise removing or adding a body leaves the rest with stale orbits.
  applyParams(true);
}

function setParam(key, v) {
  state.params[key] = v;
  applyParams(true);
}

// ── Step ────────────────────────────────────────────────────────────────────

function step(dt) {
  if (!state.running) return;
  const scaledDt = dt * state.timeScale;
  // 0.01 sub-cap keeps the Moon's tight orbit (period ≈ 2.58 time units at
  // r=1.5) accurate even at high time-scales.
  const subs = Math.max(4, Math.ceil(scaledDt / 0.01));
  const sub  = scaledDt / subs;
  for (let i = 0; i < subs; i++) {
    verletStep(state.bodies.filter(b => b.active), sub);
  }
  state.t += scaledDt;
  for (const b of state.bodies) {
    if (!b.active) continue;
    b.trail.push({ x: b.x, y: b.y });
    if (b.trail.length > TRAIL_MAX) b.trail.shift();
  }
}

// ── Render ──────────────────────────────────────────────────────────────────

// Latest camera transform — kept on `state` so the wheel/pan handlers can
// convert mouse coordinates into world coordinates.
function updateCamera() {
  const W = canvas.width, H = canvas.height;
  const p = state.params;
  const maxReach = Math.max(
    p.mercuryRadius,
    p.venusRadius,
    p.earthRadius + p.moonRadius,
    p.marsRadius,
    p.jupiterRadius,
    p.saturnRadius,
    p.uranusRadius,
    p.neptuneRadius,
    260,
  ) + 30;
  state.scale = (Math.min(W, H) / (maxReach * 2.0)) * state.zoom;
  state.cx    = W / 2 + state.panX;
  state.cy    = H / 2 + state.panY;
}

function render() {
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  updateCamera();
  const { cx, cy, scale } = state;

  // Trails
  for (const b of state.bodies) {
    if (!b.active || b.trail.length < 2) continue;
    ctx.strokeStyle = b.color + '66';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < b.trail.length; i++) {
      const x = cx + b.trail[i].x * scale;
      const y = cy + b.trail[i].y * scale;
      if (i === 0) ctx.moveTo(x, y);
      else         ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Bodies
  for (const b of state.bodies) {
    if (!b.active) continue;
    const x = cx + b.x * scale;
    const y = cy + b.y * scale;
    const grd = ctx.createRadialGradient(x, y, 0, x, y, b.glow);
    grd.addColorStop(0,    b.color + 'ff');
    grd.addColorStop(0.4,  b.color + '66');
    grd.addColorStop(1,    b.color + '00');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(x, y, b.glow, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = b.color;
    ctx.beginPath(); ctx.arc(x, y, b.radius, 0, Math.PI * 2); ctx.fill();
    ctx.font = '600 12px DM Sans, sans-serif';
    ctx.fillStyle = '#eceff4';
    ctx.fillText(b.name, x + b.glow + 4, y + 4);
  }

  // Readouts
  ctx.font = '12px ui-monospace, Menlo, monospace';
  ctx.fillStyle = '#c0c0c0';
  let ry = 22;
  ctx.fillText(`t    = ${state.t.toFixed(1)}`, 14, ry); ry += 18;
  ctx.fillText(`zoom = ${state.zoom.toFixed(2)}×`, 14, ry); ry += 18;
  const activeCount = state.bodies.filter(b => b.active).length;
  ctx.fillText(`bodies: ${activeCount} / ${state.bodies.length}`, 14, ry); ry += 18;
  for (const b of state.bodies) {
    if (!b.active) continue;
    const v = Math.hypot(b.vx, b.vy);
    ctx.fillText(`${b.name.padEnd(8)} v = ${v.toFixed(2)}`, 14, ry); ry += 18;
  }
}

// ── Animation loop ──────────────────────────────────────────────────────────

let lastT = null;
function frame(t) {
  if (lastT === null) lastT = t;
  const dt = Math.min((t - lastT) / 1000, 0.05);
  lastT = t;
  step(dt);
  render();
  requestAnimationFrame(frame);
}

// ── Controls ────────────────────────────────────────────────────────────────

function buildControls() {
  const panel = document.getElementById('controls');
  panel.innerHTML = '';

  // Parameter table — body × parameter grid. Click a row label to toggle
  // that body on/off.
  panel.appendChild(buildParamTable());

  // Time scale (full-width slider, separate from the body grid).
  // Range goes high so users can watch Neptune complete an orbit
  // (period ≈ 5070 time units ⇒ ≈ 100 s at the slider maximum).
  addSlider(panel, 'Time scale', '×', 0.1, 50, 0.1, state.timeScale,
    v => { state.timeScale = v; });

  // Play / Reset row
  const row = document.createElement('div');
  row.className = 'control-row';
  row.style.gap = '8px';
  const playPause = document.createElement('button');
  playPause.textContent = state.running ? 'Pause' : 'Play';
  playPause.style.flex = '1';
  playPause.addEventListener('click', () => {
    state.running = !state.running;
    playPause.textContent = state.running ? 'Pause' : 'Play';
  });
  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Reset';
  resetBtn.style.flex = '1';
  resetBtn.addEventListener('click', reset);
  row.appendChild(playPause);
  row.appendChild(resetBtn);
  panel.appendChild(row);

  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent =
    'Defaults are real proportions: M⊕ for masses (Sun = 333 000 M⊕), 1 AU = 200 sim units.\n' +
    'Earth mass (20 M⊕) and Moon distance (1.5 sim) are bumped so the Moon stays visible.\n' +
    'Camera: scroll to zoom · drag to pan · double-click to reset. Click a row label to toggle.';
  panel.appendChild(hint);
}

// Build the body × parameter grid. Rows: Sun + 8 planets + Moon.
// Columns: Mass, Distance, Speed. Row label is clickable as a toggle.
function buildParamTable() {
  const table = document.createElement('div');
  table.className = 'param-table';

  // Header row
  table.appendChild(cellEmpty());
  table.appendChild(cellHeader('Mass'));
  table.appendChild(cellHeader('Distance'));
  table.appendChild(cellHeader('Speed'));

  // Body rows
  for (const row of PARAM_TABLE) {
    const visual = BODY_VISUAL[row.name];
    table.appendChild(cellRowLabel(row.name, visual.color));
    table.appendChild(row.mass  ? cellSlider(...row.mass)  : cellEmpty('—'));
    table.appendChild(row.dist  ? cellSlider(...row.dist)  : cellEmpty('—'));
    table.appendChild(row.speed ? cellSlider(...row.speed) : cellEmpty('—'));
  }
  return table;
}

function cellHeader(text) {
  const d = document.createElement('div');
  d.className = 'param-cell header';
  d.textContent = text;
  return d;
}

function cellRowLabel(name, color) {
  const d = document.createElement('div');
  d.className = 'param-cell row-label toggle';
  const body = state.bodies.find(b => b.name === name);
  if (body && body.active) d.classList.add('active');
  d.innerHTML = `<span class="dot" style="background:${color}"></span>${name}`;
  d.title = `Click to toggle ${name}`;
  d.addEventListener('click', () => {
    const b = state.bodies.find(b => b.name === name);
    if (!b) return;
    setActive(name, !b.active);
    d.classList.toggle('active', b.active);
  });
  return d;
}

function cellEmpty(text = '') {
  const d = document.createElement('div');
  d.className = 'param-cell empty';
  d.textContent = text;
  return d;
}

// Pick a sensible number of decimal places given the slider's step.
function decimalsForStep(step) {
  if (step >= 1)     return 0;
  if (step >= 0.1)   return 1;
  if (step >= 0.01)  return 2;
  if (step >= 0.001) return 3;
  return 4;
}

function cellSlider(key, min, max, step) {
  const d = document.createElement('div');
  d.className = 'param-cell';
  const value = state.params[key];
  const decimals = decimalsForStep(step);
  d.innerHTML = `
    <input type="range"  class="slider" min="${min}" max="${max}" step="${step}" value="${value}">
    <input type="number" class="val"    min="${min}" max="${max}" step="${step}" value="${value.toFixed(decimals)}">
  `;
  const slider = d.querySelector('.slider');
  const num    = d.querySelector('.val');
  slider.addEventListener('input', e => {
    const v = Number(e.target.value);
    num.value = v.toFixed(decimals);
    setParam(key, v);
  });
  num.addEventListener('change', e => {
    const raw = e.target.value.trim();
    let v = Number(raw);
    if (raw === '' || Number.isNaN(v)) {
      num.value = Number(slider.value).toFixed(decimals);
      return;
    }
    v = Math.max(min, Math.min(max, v));
    num.value    = v.toFixed(decimals);
    slider.value = v;
    setParam(key, v);
  });
  return d;
}

function addSlider(panel, label, unit, min, max, step, value, onInput) {
  const decimals = decimalsForStep(step);
  const row = document.createElement('div');
  row.className = 'control-row';
  row.innerHTML = `
    <span class="control-label">${label}</span>
    <input type="range"  class="slider" min="${min}" max="${max}" step="${step}" value="${value}">
    <input type="number" class="control-value" min="${min}" max="${max}" step="${step}" value="${value.toFixed(decimals)}">
    ${unit ? `<span class="control-unit">${unit}</span>` : ''}
  `;
  const slider = row.querySelector('.slider');
  const num    = row.querySelector('.control-value');
  slider.addEventListener('input', e => {
    const v = Number(e.target.value);
    num.value = v.toFixed(decimals);
    onInput(v);
  });
  num.addEventListener('change', e => {
    const raw = e.target.value.trim();
    let v = Number(raw);
    if (raw === '' || Number.isNaN(v)) {
      num.value = Number(slider.value).toFixed(decimals);
      return;
    }
    v = Math.max(min, Math.min(max, v));
    num.value    = v.toFixed(decimals);
    slider.value = v;
    onInput(v);
  });
  panel.appendChild(row);
  return slider;
}

window.addEventListener('load', init);
