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
  timeScale: 10,
  running:   true,
};

// Slider config table — drives both the parameter grid layout and the
// param->slider binding. `null` cells are rendered as dashes (e.g. the Sun
// has no orbit so its Distance/Speed cells are blank).
//   [paramKey, min, max, step]
const PARAM_TABLE = [
  { name: 'Sun',     mass: ['sunMass',      200,  3000, 10  ], dist: null,                                speed: null                              },
  { name: 'Mercury', mass: ['mercuryMass',  0.1,    30,  0.1], dist: ['mercuryRadius',  30,  300,  1   ], speed: ['mercurySpeed', 0.5, 1.5, 0.01] },
  { name: 'Venus',   mass: ['venusMass',      1,    60,  0.1], dist: ['venusRadius',    60,  300,  1   ], speed: ['venusSpeed',   0.5, 1.5, 0.01] },
  { name: 'Earth',   mass: ['earthMass',      1,   100,  1  ], dist: ['earthRadius',    80,  320,  1   ], speed: ['earthSpeed',   0.5, 1.5, 0.01] },
  { name: 'Moon',    mass: ['moonMass',    0.01,     5,  0.01], dist: ['moonRadius',     5,   30,  0.5 ], speed: ['moonSpeed',    0.5, 1.5, 0.01] },
  { name: 'Mars',    mass: ['marsMass',     0.5,    40,  0.1], dist: ['marsRadius',    100,  450,  1   ], speed: ['marsSpeed',    0.5, 1.5, 0.01] },
  { name: 'Jupiter', mass: ['jupiterMass',    5,   300,  1  ], dist: ['jupiterRadius',  80,  800,  1   ], speed: ['jupiterSpeed', 0.5, 1.5, 0.01] },
  { name: 'Saturn',  mass: ['saturnMass',     1,   200,  1  ], dist: ['saturnRadius',  400, 1100,  5   ], speed: ['saturnSpeed',  0.5, 1.5, 0.01] },
  { name: 'Uranus',  mass: ['uranusMass',     1,   100,  1  ], dist: ['uranusRadius',  600, 1300,  5   ], speed: ['uranusSpeed',  0.5, 1.5, 0.01] },
  { name: 'Neptune', mass: ['neptuneMass',    1,   100,  1  ], dist: ['neptuneRadius', 800, 1500,  5   ], speed: ['neptuneSpeed', 0.5, 1.5, 0.01] },
];

let canvas, ctx;

function init() {
  canvas = document.getElementById('canvas2d');
  ctx    = canvas.getContext('2d');
  resize();
  applyParams(false);
  buildControls();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  canvas.width  = Math.round(rect.width);
  canvas.height = Math.round(rect.height);
}

// Re-initialise body positions/velocities from current params.
// preserveActive=true keeps each body's on/off toggle state across edits.
// Match by name so the body lineup can change without losing toggle state.
function applyParams(preserveActive = true) {
  const newBodies = buildBodies(state.params);
  if (preserveActive && state.bodies.length) {
    const oldByName = new Map(state.bodies.map(b => [b.name, b]));
    for (const nb of newBodies) {
      const ob = oldByName.get(nb.name);
      if (ob) nb.active = ob.active;
    }
  }
  state.bodies = newBodies;
  state.t = 0;
}

function reset() {
  state.params = { ...DEFAULT_PARAMS };
  applyParams(false);
  state.running = true;
  buildControls();
}

function setActive(name, on) {
  const b = state.bodies.find(b => b.name === name);
  if (!b) return;
  b.active = on;
  if (!on) b.trail = [];
}

function setParam(key, v) {
  state.params[key] = v;
  applyParams(true);
}

// ── Step ────────────────────────────────────────────────────────────────────

function step(dt) {
  if (!state.running) return;
  const scaledDt = dt * state.timeScale;
  const subs = Math.max(4, Math.ceil(scaledDt / 0.04));
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

function render() {
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H / 2;

  // Auto-fit so the largest orbit stays visible.
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
  const scale = Math.min(W, H) / (maxReach * 2.0);

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
  ctx.fillText(`t  = ${state.t.toFixed(1)}`, 14, ry); ry += 18;
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

  // Time scale (full-width slider, separate from the body grid)
  addSlider(panel, 'Time scale', '×', 0.1, 30, 0.1, state.timeScale,
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
    'Drag any cell slider to live-edit that orbital parameter.\n' +
    'Speed = 1 → circular; ≥ √2 ≈ 1.41 → escape orbit.\n' +
    'Keep the moon inside Earth\'s Hill radius for a bound lunar orbit.';
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

function cellSlider(key, min, max, step) {
  const d = document.createElement('div');
  d.className = 'param-cell';
  const value = state.params[key];
  const decimals = step < 1 ? 2 : 0;
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
  const decimals = step < 1 ? 2 : 0;
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
