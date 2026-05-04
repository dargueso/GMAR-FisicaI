// simulations/gravity/main.js
//
// Two-body gravity demo for first-year students. Drag either body to change
// r; force arrows scale with |F|; the F-vs-r chart at the bottom of the
// canvas marks the current point on the 1/r² curve. "Release" lets the
// bodies fall together under gravity.

const SCENE_FRACTION   = 0.70;      // canvas vertical split (scene over chart)
const ARROW_MAX_PX     = 110;
const ARROW_PER_F      = 1.2;       // 1 force unit → this many arrow pixels
const COLLIDE_PADDING  = 1;

// Velocity arrow / handle constants. The "handle" is a small green dot the
// user drags to set or change a body's initial velocity.
const VEL_PX_PER_UNIT  = 6;         // 1 velocity unit → this many arrow pixels
const VEL_HANDLE_R     = 6;         // visual radius of the handle dot
const VEL_HANDLE_HIT   = 14;        // click radius to grab the handle
const VEL_DEFAULT_OFF  = 30;        // px past body radius for the v=0 handle
const VEL_COLOR        = '#88e08c';

const state = {
  b1: null,
  b2: null,
  running:   false,    // dynamic mode (gravity moves them)
  dragging:  null,     // body currently held by mouse/touch
  dragMode:  null,     // 'position' or 'velocity'
  collided:  false,
};

const DEFAULTS = {
  m1: 20,
  m2: 20,
  // Body initial positions are set in canvas pixels relative to the scene
  // area. They are recomputed in resize() so they stay sensible at any size.
};

function makeBodies(canvas) {
  const W = canvas.width, H = canvas.height;
  const sceneH = H * SCENE_FRACTION;
  return {
    b1: { name: 'A', mass: DEFAULTS.m1, color: '#5fb3d4',
          x: W * 0.30, y: sceneH * 0.5, vx: 0, vy: 0,
          radius: bodyRadius(DEFAULTS.m1) },
    b2: { name: 'B', mass: DEFAULTS.m2, color: '#ff9966',
          x: W * 0.70, y: sceneH * 0.5, vx: 0, vy: 0,
          radius: bodyRadius(DEFAULTS.m2) },
  };
}

// Visual radius scales like mass^(1/3) so volume ∝ mass.
function bodyRadius(m) { return 6 + Math.cbrt(m) * 3.2; }

let canvas, ctx;

function init() {
  canvas = document.getElementById('canvas2d');
  ctx    = canvas.getContext('2d');
  resize();
  const b = makeBodies(canvas);
  state.b1 = b.b1;
  state.b2 = b.b2;
  attachPointer();
  buildControls();
  window.addEventListener('resize', () => {
    const oldW = canvas.width, oldH = canvas.height;
    resize();
    // Rescale body positions so they stay in the same relative spot
    const sx = canvas.width  / oldW;
    const sy = canvas.height / oldH;
    state.b1.x *= sx; state.b1.y *= sy;
    state.b2.x *= sx; state.b2.y *= sy;
  });
  requestAnimationFrame(frame);
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  canvas.width  = Math.round(rect.width);
  canvas.height = Math.round(rect.height);
}

function reset() {
  const b = makeBodies(canvas);
  state.b1 = b.b1;
  state.b2 = b.b2;
  state.running  = false;
  state.collided = false;
  buildControls();
}

// ── Pointer (mouse + touch) ────────────────────────────────────────────────

function attachPointer() {
  const onDown = (x, y) => {
    // Velocity handles take priority — they sit just outside the body.
    for (const b of [state.b1, state.b2]) {
      const h = getVelocityHandlePos(b);
      const dx = x - h.x, dy = y - h.y;
      if (dx*dx + dy*dy < VEL_HANDLE_HIT * VEL_HANDLE_HIT) {
        state.dragging = b;
        state.dragMode = 'velocity';
        return;
      }
    }
    for (const b of [state.b1, state.b2]) {
      const dx = x - b.x, dy = y - b.y;
      const hit = b.radius + 14;
      if (dx*dx + dy*dy < hit * hit) {
        state.dragging = b;
        state.dragMode = 'position';
        return;
      }
    }
  };
  const onMove = (x, y) => {
    if (!state.dragging) return;
    if (state.dragMode === 'position') {
      state.dragging.x = x;
      state.dragging.y = y;
      // Velocity is preserved — position and velocity are independent state.
    } else if (state.dragMode === 'velocity') {
      state.dragging.vx = (x - state.dragging.x) / VEL_PX_PER_UNIT;
      state.dragging.vy = (y - state.dragging.y) / VEL_PX_PER_UNIT;
    }
    // Dragging apart breaks the "collided" lock so the user can rerun.
    if (state.collided && distance(state.b1, state.b2) > state.b1.radius + state.b2.radius + 4) {
      state.collided = false;
    }
  };
  const onUp = () => { state.dragging = null; state.dragMode = null; };

  function pos(e) {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }
  canvas.addEventListener('mousedown',  e => { const p = pos(e); onDown(p.x, p.y); });
  canvas.addEventListener('mousemove',  e => { const p = pos(e); onMove(p.x, p.y); });
  window.addEventListener('mouseup',    onUp);
  canvas.addEventListener('touchstart', e => { e.preventDefault(); const p = pos(e); onDown(p.x, p.y); }, { passive: false });
  canvas.addEventListener('touchmove',  e => { e.preventDefault(); const p = pos(e); onMove(p.x, p.y); }, { passive: false });
  canvas.addEventListener('touchend',   onUp);
}

function distance(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  return Math.sqrt(dx*dx + dy*dy);
}

// Where the green velocity handle sits in canvas coords. When |v| is too
// small for a graspable arrow tip, the handle defaults to a fixed offset to
// the right of the body so the user can still grab it.
function getVelocityHandlePos(b) {
  const speed = Math.hypot(b.vx, b.vy);
  const lenPx = speed * VEL_PX_PER_UNIT;
  if (lenPx < b.radius + 12) {
    return {
      x: b.x + b.radius + VEL_DEFAULT_OFF,
      y: b.y,
      atDefault: true,
    };
  }
  return {
    x: b.x + b.vx * VEL_PX_PER_UNIT,
    y: b.y + b.vy * VEL_PX_PER_UNIT,
    atDefault: false,
  };
}

// ── Step ────────────────────────────────────────────────────────────────────

function step(dt) {
  if (!state.running || state.collided) return;
  if (state.dragging) return;     // physics paused while dragging
  // Sub-step so high-acceleration close encounters don't blow up.
  const subs = 8;
  const sub  = dt / subs;
  for (let i = 0; i < subs; i++) physicsStep(state.b1, state.b2, sub);

  // Collision: stop when bodies touch.
  if (distance(state.b1, state.b2) < state.b1.radius + state.b2.radius + COLLIDE_PADDING) {
    state.collided = true;
    state.b1.vx = state.b1.vy = 0;
    state.b2.vx = state.b2.vy = 0;
  }

  // Keep bodies inside the scene area (soft clamp to avoid leaving canvas).
  const sceneH = canvas.height * SCENE_FRACTION;
  for (const b of [state.b1, state.b2]) {
    b.x = Math.max(b.radius, Math.min(canvas.width  - b.radius, b.x));
    b.y = Math.max(b.radius, Math.min(sceneH        - b.radius, b.y));
  }
}

// ── Render ──────────────────────────────────────────────────────────────────

function render() {
  const W = canvas.width, H = canvas.height;
  const sceneH = H * SCENE_FRACTION;
  ctx.clearRect(0, 0, W, H);

  // Scene background
  drawScene(W, sceneH);

  // Chart at the bottom
  drawChart(0, sceneH, W, H - sceneH);
}

function drawScene(W, sceneH) {
  const { b1, b2 } = state;
  const r = distance(b1, b2);
  const F = gravForce(b1.mass, b2.mass, r);

  // Distance line between centres
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(b1.x, b1.y);
  ctx.lineTo(b2.x, b2.y);
  ctx.stroke();
  ctx.setLineDash([]);

  // r label at midpoint
  const mx = (b1.x + b2.x) / 2;
  const my = (b1.y + b2.y) / 2;
  ctx.fillStyle = '#c0c0c0';
  ctx.font = '11px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`r = ${r.toFixed(0)}`, mx, my - 6);
  ctx.textAlign = 'left';

  // Force arrows: each body pulled toward the other.
  const arrowLen = Math.min(F * ARROW_PER_F, ARROW_MAX_PX);
  const ux = (b2.x - b1.x) / (r || 1);
  const uy = (b2.y - b1.y) / (r || 1);
  drawArrow(ctx, b1.x, b1.y, b1.x + ux * arrowLen, b1.y + uy * arrowLen, '#ffd166');
  drawArrow(ctx, b2.x, b2.y, b2.x - ux * arrowLen, b2.y - uy * arrowLen, '#ffd166');

  // Velocity arrows + handles (drawn before bodies so the body sits on top
  // of the arrow tail, but the handle sits on top of everything).
  drawVelocityArrow(b1);
  drawVelocityArrow(b2);

  // Bodies
  drawBody(ctx, b1);
  drawBody(ctx, b2);

  // Velocity handles last so they're always grabbable visually.
  drawVelocityHandle(b1);
  drawVelocityHandle(b2);

  // Readouts
  ctx.font = '12px ui-monospace, Menlo, monospace';
  ctx.fillStyle = '#c0c0c0';
  const v1 = Math.hypot(b1.vx, b1.vy);
  const v2 = Math.hypot(b2.vx, b2.vy);
  let ry = 22;
  ctx.fillText(`m₁ = ${b1.mass.toFixed(1)}`, 14, ry); ry += 18;
  ctx.fillText(`m₂ = ${b2.mass.toFixed(1)}`, 14, ry); ry += 18;
  ctx.fillText(`r  = ${r.toFixed(1)}`,        14, ry); ry += 18;
  ctx.fillText(`F  = ${F.toFixed(2)}`,        14, ry); ry += 18;
  ctx.fillText(`v₁ = ${v1.toFixed(2)}`,       14, ry); ry += 18;
  ctx.fillText(`v₂ = ${v2.toFixed(2)}`,       14, ry); ry += 18;
  if (state.collided) {
    ctx.fillStyle = '#ffd166';
    ctx.fillText('contact — press Reset',     14, ry);
  }
}

function drawVelocityArrow(b) {
  const speed = Math.hypot(b.vx, b.vy);
  if (speed < 1e-3) return;     // no shaft to draw — handle alone suffices
  const tipX = b.x + b.vx * VEL_PX_PER_UNIT;
  const tipY = b.y + b.vy * VEL_PX_PER_UNIT;
  drawArrow(ctx, b.x, b.y, tipX, tipY, VEL_COLOR);
}

function drawVelocityHandle(b) {
  const h = getVelocityHandlePos(b);
  if (h.atDefault) {
    // Dimmed dashed lead so it reads as "drag me to set velocity".
    ctx.strokeStyle = 'rgba(136,224,140,0.45)';
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(b.x + b.radius, b.y);
    ctx.lineTo(h.x - VEL_HANDLE_R, h.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(136,224,140,0.55)';
    ctx.strokeStyle = VEL_COLOR;
  } else {
    ctx.fillStyle = VEL_COLOR;
    ctx.strokeStyle = VEL_COLOR;
  }
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(h.x, h.y, VEL_HANDLE_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawBody(ctx, b) {
  // Glow
  const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius * 2.2);
  grd.addColorStop(0,   b.color + 'ff');
  grd.addColorStop(0.4, b.color + '66');
  grd.addColorStop(1,   b.color + '00');
  ctx.fillStyle = grd;
  ctx.beginPath(); ctx.arc(b.x, b.y, b.radius * 2.2, 0, Math.PI * 2); ctx.fill();
  // Core
  ctx.fillStyle = b.color;
  ctx.beginPath(); ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2); ctx.fill();
  // Label
  ctx.fillStyle = '#0f1117';
  ctx.font = `bold ${Math.max(11, b.radius)}px DM Sans, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.name, b.x, b.y);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
}

function drawArrow(ctx, x0, y0, x1, y1, color) {
  if (Math.hypot(x1 - x0, y1 - y0) < 4) return;
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  const ang = Math.atan2(y1 - y0, x1 - x0);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - 10 * Math.cos(ang - 0.4), y1 - 10 * Math.sin(ang - 0.4));
  ctx.lineTo(x1 - 10 * Math.cos(ang + 0.4), y1 - 10 * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ── F vs r chart ────────────────────────────────────────────────────────────

function drawChart(x, y, w, h) {
  const padL = 46, padR = 14, padTop = 18, padBot = 22;
  const plotW = w - padL - padR;
  const plotH = h - padTop - padBot;

  // Background
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();

  // Title
  ctx.fillStyle = '#c0c0c0';
  ctx.font = '11px ui-monospace, Menlo, monospace';
  ctx.fillText('F  vs  r    (F = G·m₁·m₂ / r²)', x + 8, y + 14);

  const r0 = distance(state.b1, state.b2);
  const F0 = gravForce(state.b1.mass, state.b2.mass, r0);

  // Domain: r from a small floor to the canvas diagonal.
  const rMin = 20;
  const rMax = Math.hypot(canvas.width, canvas.height * SCENE_FRACTION);
  // Range: cap F so the curve's near-singular tail doesn't dominate.
  const FAtMin = gravForce(state.b1.mass, state.b2.mass, rMin);
  const FAtMax = gravForce(state.b1.mass, state.b2.mass, rMax);
  // Use the F at r=80 as a reasonable upper visual bound — keeps the elbow
  // of the 1/r² curve visible without burying everything in the y-axis.
  const FCap = Math.max(F0 * 1.4, gravForce(state.b1.mass, state.b2.mass, 80));
  const FMin = 0;
  const FMax = FCap;

  // Axes
  const x0 = x + padL, y0 = y + padTop + plotH;
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.moveTo(x0, y + padTop);
  ctx.lineTo(x0, y0);
  ctx.lineTo(x0 + plotW, y0);
  ctx.stroke();

  // Axis labels
  ctx.fillStyle = '#c0c0c0';
  ctx.font = '10px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'right';
  ctx.fillText(FMax.toFixed(0), x0 - 4, y + padTop + 8);
  ctx.fillText('0',              x0 - 4, y0 + 4);
  ctx.textAlign = 'center';
  ctx.fillText('r →', x0 + plotW - 14, y0 + 14);
  ctx.fillText(rMax.toFixed(0), x0 + plotW, y0 + 14);
  ctx.textAlign = 'left';
  ctx.fillText('F', x0 - 18, y + padTop + 4);

  // 1/r² curve
  ctx.strokeStyle = '#5fb3d4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= plotW; i++) {
    const r = rMin + (rMax - rMin) * (i / plotW);
    const f = gravForce(state.b1.mass, state.b2.mass, r);
    const py = y + padTop + plotH * (1 - clamp01((f - FMin) / (FMax - FMin)));
    if (i === 0) ctx.moveTo(x0 + i, py);
    else         ctx.lineTo(x0 + i, py);
  }
  ctx.stroke();

  // Current (r₀, F₀) marker — only if in chart range
  if (r0 >= rMin && r0 <= rMax) {
    const px = x0 + plotW * ((r0 - rMin) / (rMax - rMin));
    const py = y + padTop + plotH * (1 - clamp01((F0 - FMin) / (FMax - FMin)));
    // Drop lines to the axes
    ctx.strokeStyle = 'rgba(255,209,102,0.4)';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(px, y0); ctx.lineTo(px, py);
    ctx.moveTo(x0, py); ctx.lineTo(px, py);
    ctx.stroke();
    ctx.setLineDash([]);
    // Dot
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
  }
}

function clamp01(v) { return Math.max(0, Math.min(1, v)); }

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

  addSlider(panel, 'Mass A (m₁)', '', 1, 80, 0.1, state.b1.mass, v => {
    state.b1.mass = v;
    state.b1.radius = bodyRadius(v);
  });
  addSlider(panel, 'Mass B (m₂)', '', 1, 80, 0.1, state.b2.mass, v => {
    state.b2.mass = v;
    state.b2.radius = bodyRadius(v);
  });

  // Release / Pause / Reset row
  const row = document.createElement('div');
  row.className = 'control-row';
  row.style.gap = '8px';
  const release = document.createElement('button');
  release.textContent = state.running ? 'Pause' : 'Release';
  release.style.flex = '1';
  release.addEventListener('click', () => {
    state.running = !state.running;
    release.textContent = state.running ? 'Pause' : 'Release';
  });
  const resetBtn = document.createElement('button');
  resetBtn.textContent = 'Reset';
  resetBtn.style.flex = '1';
  resetBtn.addEventListener('click', reset);
  row.appendChild(release);
  row.appendChild(resetBtn);
  panel.appendChild(row);

  const hint = document.createElement('p');
  hint.className = 'hint';
  hint.textContent =
    'Drag a body to reposition it. Drag the green dot to set its initial velocity.\n' +
    'Yellow arrows: F = G·m₁·m₂/r². Green arrows: v. The chart marks (r, F) on the 1/r² curve.\n' +
    'Press Release to let gravity act on the bodies (they keep their initial v).';
  panel.appendChild(hint);
}

function addSlider(panel, label, unit, min, max, step, value, onInput) {
  const row = document.createElement('div');
  row.className = 'control-row';
  row.innerHTML = `
    <span class="control-label">${label}</span>
    <input type="range" min="${min}" max="${max}" step="${step}" value="${value}">
    <span class="control-value">${value.toFixed(2)} ${unit}</span>
  `;
  const slider  = row.querySelector('input');
  const readout = row.querySelector('.control-value');
  slider.addEventListener('input', e => {
    const v = Number(e.target.value);
    readout.textContent = `${v.toFixed(2)} ${unit}`;
    onInput(v);
  });
  panel.appendChild(row);
  return slider;
}

window.addEventListener('load', init);
