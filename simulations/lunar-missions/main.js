// simulations/lunar-missions/main.js
//
// Animation loop, rendering, and UI wiring for the Apollo & Artemis
// trajectory viewer. View is the Earth–Moon rotating frame so paths show
// their characteristic shapes (figure-8 free returns, low orbits, DRO).

const state = {
  active:         new Map(MISSIONS.map(m => [m.id, true])),
  elapsedDays:    0,
  daysPerSecond:  2,
  running:        true,
};

let canvas, ctx;

function init() {
  canvas = document.getElementById('canvas2d');
  ctx    = canvas.getContext('2d');
  resize();
  precomputePaths();
  buildControls();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  canvas.width  = Math.round(rect.width);
  canvas.height = Math.round(rect.height);
}

// Map normalised (rotating-frame) coords to canvas pixels. Earth ↔ Moon
// span occupies the middle ~64% of the canvas width so trajectories that
// arc above/below have room.
function toCanvas(x, y) {
  const W = canvas.width, H = canvas.height;
  const earthX = W * 0.18;
  const moonX  = W * 0.82;
  const cy     = H * 0.50;
  const span   = moonX - earthX;
  return { x: earthX + x * span, y: cy + y * span };
}

// ── Step ────────────────────────────────────────────────────────────────────

function step(dt) {
  if (!state.running) return;
  state.elapsedDays += dt * state.daysPerSecond;
  // Cap at the longest active mission so the readout doesn't run away.
  let maxDur = 0;
  for (const m of MISSIONS) {
    if (state.active.get(m.id) && m.duration > maxDur) maxDur = m.duration;
  }
  if (state.elapsedDays > maxDur && maxDur > 0) state.elapsedDays = maxDur;
}

// ── Render ──────────────────────────────────────────────────────────────────

function render() {
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Frame label
  ctx.font = '11px ui-monospace, Menlo, monospace';
  ctx.fillStyle = '#6b7280';
  ctx.fillText('Earth–Moon rotating frame', 14, H - 12);

  // Earth + Moon bodies
  drawBody(toCanvas(0, 0), '#4a90e2', 18, 'Earth');
  drawBody(toCanvas(1, 0), '#cfcfcf', 9,  'Moon');

  // Active mission paths
  for (const m of MISSIONS) {
    if (!state.active.get(m.id)) continue;
    drawMissionPath(m);
  }

  // Time + active count readout
  ctx.font = '13px ui-monospace, Menlo, monospace';
  ctx.fillStyle = '#eceff4';
  ctx.fillText(`Day ${state.elapsedDays.toFixed(1)}`, 14, 22);
  let activeCount = 0;
  for (const v of state.active.values()) if (v) activeCount++;
  ctx.font = '11px ui-monospace, Menlo, monospace';
  ctx.fillStyle = '#c0c0c0';
  ctx.fillText(`${activeCount} / ${MISSIONS.length} missions`, 14, 40);
}

function drawMissionPath(m) {
  const tNow = Math.min(1, state.elapsedDays / m.duration);
  const lastIdx = Math.floor(tNow * PATH_SAMPLES);

  // Faded full path (preview)
  ctx.strokeStyle = m.color + '33';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i <= PATH_SAMPLES; i++) {
    const p = toCanvas(m.path[i].x, m.path[i].y);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else         ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();

  // Bright trail up to the current position
  if (lastIdx > 0) {
    ctx.strokeStyle = m.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= lastIdx; i++) {
      const p = toCanvas(m.path[i].x, m.path[i].y);
      if (i === 0) ctx.moveTo(p.x, p.y);
      else         ctx.lineTo(p.x, p.y);
    }
    const cur  = trajectoryPos(m, tNow);
    const curC = toCanvas(cur.x, cur.y);
    ctx.lineTo(curC.x, curC.y);
    ctx.stroke();
  }

  // Spacecraft marker — only while in flight (hide once it has landed back).
  if (tNow > 0 && tNow < 1) {
    const cur  = trajectoryPos(m, tNow);
    const curC = toCanvas(cur.x, cur.y);
    // Glow
    const grd = ctx.createRadialGradient(curC.x, curC.y, 0, curC.x, curC.y, 10);
    grd.addColorStop(0,   m.color + 'ff');
    grd.addColorStop(0.5, m.color + '66');
    grd.addColorStop(1,   m.color + '00');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(curC.x, curC.y, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = m.color;
    ctx.beginPath(); ctx.arc(curC.x, curC.y, 3.5, 0, Math.PI * 2); ctx.fill();
    // Label
    ctx.font = '600 11px DM Sans, sans-serif';
    ctx.fillStyle = '#eceff4';
    ctx.fillText(m.name, curC.x + 10, curC.y + 4);
  }
}

function drawBody(p, color, r, label) {
  // Glow
  const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 2.4);
  grd.addColorStop(0,   color + 'ff');
  grd.addColorStop(0.4, color + '66');
  grd.addColorStop(1,   color + '00');
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(p.x, p.y, r * 2.4, 0, Math.PI * 2); ctx.fill();
  // Core
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
  // Label
  ctx.font = '600 12px DM Sans, sans-serif';
  ctx.fillStyle = '#eceff4';
  ctx.textAlign = 'center';
  ctx.fillText(label, p.x, p.y + r + 14);
  ctx.textAlign = 'left';
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

  // Group-select buttons
  const groupRow = document.createElement('div');
  groupRow.className = 'control-row';
  groupRow.style.gap = '6px';
  const groupLabel = document.createElement('span');
  groupLabel.className = 'control-label';
  groupLabel.textContent = 'Show';
  groupRow.appendChild(groupLabel);
  const groups = [
    ['All',     () => true],
    ['Apollo',  m => m.program === 'Apollo'],
    ['Artemis', m => m.program === 'Artemis'],
    ['None',    () => false],
  ];
  for (const [label, filter] of groups) {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.style.flex = '1';
    btn.style.padding = '6px 4px';
    btn.addEventListener('click', () => {
      for (const m of MISSIONS) state.active.set(m.id, filter(m));
      buildControls();
    });
    groupRow.appendChild(btn);
  }
  panel.appendChild(groupRow);

  // Mission list — one row per mission
  const list = document.createElement('div');
  list.className = 'mission-list';
  for (const m of MISSIONS) {
    const item = document.createElement('label');
    item.className = 'mission-item';
    const checked = state.active.get(m.id) ? 'checked' : '';
    item.innerHTML = `
      <input type="checkbox" ${checked}>
      <span class="dot" style="background:${m.color}"></span>
      <span class="info">
        <span class="title">${m.name}</span>
        <span class="meta">${m.year} · ${m.description} · ${m.duration.toFixed(1)} d</span>
      </span>
    `;
    item.querySelector('input').addEventListener('change', e => {
      state.active.set(m.id, e.target.checked);
    });
    list.appendChild(item);
  }
  panel.appendChild(list);

  // Animation speed
  addSlider(panel, 'Speed', 'd/s', 0.5, 20, 0.1, state.daysPerSecond, v => {
    state.daysPerSecond = v;
  });

  // Play / Pause / Reset
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
  const reset = document.createElement('button');
  reset.textContent = 'Reset';
  reset.style.flex = '1';
  reset.addEventListener('click', () => {
    state.elapsedDays = 0;
    state.running = true;
    playPause.textContent = 'Pause';
  });
  row.appendChild(playPause);
  row.appendChild(reset);
  panel.appendChild(row);

  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent =
    'Earth–Moon rotating frame: the Moon stays fixed so trajectory shapes are clear.\n' +
    'Apollo 8/11/17: low lunar orbit. Apollo 13: free-return slingshot (no orbit).\n' +
    'Artemis I: large Distant Retrograde Orbit. Artemis II: lunar flyby. Artemis III: landing.';
  panel.appendChild(hint);
}

function addSlider(panel, label, unit, min, max, step, value, onInput) {
  const row = document.createElement('div');
  row.className = 'control-row';
  row.innerHTML = `
    <span class="control-label">${label}</span>
    <input type="range" min="${min}" max="${max}" step="${step}" value="${value}">
    <span class="control-value">${value.toFixed(1)} ${unit}</span>
  `;
  const slider  = row.querySelector('input');
  const readout = row.querySelector('.control-value');
  slider.addEventListener('input', e => {
    const v = Number(e.target.value);
    readout.textContent = `${v.toFixed(1)} ${unit}`;
    onInput(v);
  });
  panel.appendChild(row);
  return slider;
}

window.addEventListener('load', init);
