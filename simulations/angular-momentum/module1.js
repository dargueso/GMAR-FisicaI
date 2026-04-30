// simulations/angular-momentum/module1.js
//
// Module 1 — Angular momentum (L = Iω).
// Top-down view of a rotating mass ring. Dragging the radius slider conserves
// L by adjusting ω. The L vector arrow points along +z (out of the page) and
// keeps a fixed length on screen — the visual hook that drives the lesson.

(function () {
'use strict';

const NUM_MASSES = 8;          // particles arranged on the ring
const RING_PX_PER_M = 80;      // metres → pixels in the canvas
const ARROW_BASE_PX = 90;      // L arrow length on screen (constant)

class Module1 {
  constructor() {
    this.angle = 0;       // current ring rotation (rad)
    this.s = PhysicsState.module1;
    this._setLFromSliders();
  }

  // L = I·ω with I = m·r² (thin ring approximation)
  _setLFromSliders() {
    this.s.I = ringInertia(this.s.m, this.s.r);
    this.s.L = this.s.I * this.s.omega;
  }

  init(ctx) {
    this.ctx = ctx;
    this.angle = 0;
    this._setLFromSliders();
  }

  // Slider hooks. Mass and ω-direct edits redefine L; radius preserves it.
  setMass(m)        { this.s.m = m;     this._setLFromSliders(); }
  setOmegaDirect(w) { this.s.omega = w; this._setLFromSliders(); }
  setRadius(r) {
    this.s.r = r;
    this.s.I = ringInertia(this.s.m, this.s.r);
    this.s.omega = omegaForConservedL(this.s.L, this.s.m, this.s.r);
  }

  update(dt) {
    this.angle += this.s.omega * dt;
  }

  render() {
    const ctx = this.ctx;
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2, cy = H / 2;
    const rPx = this.s.r * RING_PX_PER_M;

    // Faint guideline showing the maximum-radius envelope (3 m)
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 3 * RING_PX_PER_M, 0, Math.PI * 2);
    ctx.stroke();

    // Ring outline
    ctx.strokeStyle = 'rgba(95,179,212,0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
    ctx.stroke();

    // Mass beads on the ring — glow + core
    for (let i = 0; i < NUM_MASSES; i++) {
      const a = this.angle + (i * 2 * Math.PI) / NUM_MASSES;
      const x = cx + Math.cos(a) * rPx;
      const y = cy + Math.sin(a) * rPx;
      const grd = ctx.createRadialGradient(x, y, 0, x, y, 14);
      grd.addColorStop(0,   'rgba(255,210,120,0.95)');
      grd.addColorStop(0.5, 'rgba(255,150,60,0.45)');
      grd.addColorStop(1,   'rgba(255,150,60,0.0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe7a3';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Spoke from centre to one bead — visual reference for ω
    const refA = this.angle;
    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(refA) * rPx, cy + Math.sin(refA) * rPx);
    ctx.stroke();

    // ω arrow — small curved arrow at centre, scales with |ω|
    drawOmegaArc(ctx, cx, cy, 30, this.s.omega);

    // Angular-momentum vector L: drawn pointing "up-right" out of the page.
    // Constant on-screen length to emphasise that L doesn't change with r.
    drawLVector(ctx, cx, cy, ARROW_BASE_PX);

    // Caption block with live readouts
    drawReadouts(ctx, [
      `r = ${this.s.r.toFixed(2)} m`,
      `m = ${this.s.m.toFixed(2)} kg`,
      `ω = ${this.s.omega.toFixed(2)} rad/s`,
      `I = ${this.s.I.toFixed(2)} kg·m²`,
      `L = ${this.s.L.toFixed(2)} kg·m²/s`,
    ]);
  }

  buildControls(panel) {
    panel.innerHTML = '';
    addSlider(panel, 'Total mass', 'kg', 1, 20, 0.1, this.s.m,
      v => { this.setMass(v); });
    addSlider(panel, 'Radius', 'm', 0.5, 3, 0.01, this.s.r,
      v => { this.setRadius(v); });
    addSlider(panel, 'Angular velocity', 'rad/s', 0.5, 5, 0.01, this.s.omega,
      v => { this.setOmegaDirect(v); });
    addHint(panel,
      'Drag the radius slider — ω changes automatically so L stays constant.\n' +
      'Marine context: why do hurricanes spin faster as they tighten toward the eye?');
  }
}

// ── Drawing helpers shared by modules ──────────────────────────────────────

function drawOmegaArc(ctx, cx, cy, radius, omega) {
  if (Math.abs(omega) < 1e-3) return;
  const dir = Math.sign(omega);
  const sweep = clamp(Math.abs(omega) / 5, 0.2, 1) * Math.PI * 1.4;
  ctx.strokeStyle = '#5fb3d4';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (dir > 0) ctx.arc(cx, cy, radius, -Math.PI/2, -Math.PI/2 + sweep);
  else         ctx.arc(cx, cy, radius, -Math.PI/2, -Math.PI/2 - sweep, true);
  ctx.stroke();
  // arrow head
  const endA = -Math.PI/2 + dir * sweep;
  const ex = cx + Math.cos(endA) * radius;
  const ey = cy + Math.sin(endA) * radius;
  const tx = -Math.sin(endA) * dir;
  const ty =  Math.cos(endA) * dir;
  ctx.fillStyle = '#5fb3d4';
  ctx.beginPath();
  ctx.moveTo(ex + tx*8, ey + ty*8);
  ctx.lineTo(ex - ty*5, ey + tx*5);
  ctx.lineTo(ex + ty*5, ey - tx*5);
  ctx.closePath();
  ctx.fill();
}

function drawLVector(ctx, cx, cy, len) {
  // Pseudo-3D upward arrow ("out of the page") at the centre.
  const tipX = cx + len * 0.35;
  const tipY = cy - len * 0.85;
  ctx.lineWidth = 3;
  // Glow
  ctx.shadowColor = '#ffd166';
  ctx.shadowBlur = 14;
  ctx.strokeStyle = '#ffd166';
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();
  // Arrowhead
  const ang = Math.atan2(tipY - cy, tipX - cx);
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - 12 * Math.cos(ang - 0.4), tipY - 12 * Math.sin(ang - 0.4));
  ctx.lineTo(tipX - 12 * Math.cos(ang + 0.4), tipY - 12 * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  // Label
  ctx.fillStyle = '#ffd166';
  ctx.font = 'bold 14px DM Sans, sans-serif';
  ctx.fillText('L', tipX + 6, tipY - 4);
}

function drawReadouts(ctx, lines) {
  ctx.font = '12px ui-monospace, Menlo, monospace';
  ctx.fillStyle = '#c0c0c0';
  let y = 22;
  for (const line of lines) {
    ctx.fillText(line, 14, y);
    y += 18;
  }
}

// ── Tiny control-panel helpers (shared) ────────────────────────────────────

function addSlider(panel, label, unit, min, max, step, value, onInput) {
  const row = document.createElement('div');
  row.className = 'control-row';
  row.innerHTML = `
    <span class="control-label">${label}</span>
    <input type="range" min="${min}" max="${max}" step="${step}" value="${value}">
    <span class="control-value">${value.toFixed(2)} ${unit}</span>
  `;
  const slider = row.querySelector('input');
  const readout = row.querySelector('.control-value');
  slider.addEventListener('input', e => {
    const v = Number(e.target.value);
    readout.textContent = `${v.toFixed(2)} ${unit}`;
    onInput(v);
  });
  panel.appendChild(row);
  return slider;
}

function addSelect(panel, label, options, value, onChange) {
  const row = document.createElement('div');
  row.className = 'control-row';
  const opts = options.map(o =>
    `<option value="${o.value}"${o.value === value ? ' selected' : ''}>${o.label}</option>`
  ).join('');
  row.innerHTML = `
    <span class="control-label">${label}</span>
    <select>${opts}</select>
  `;
  const sel = row.querySelector('select');
  sel.addEventListener('change', e => onChange(e.target.value));
  panel.appendChild(row);
  return sel;
}

function addButton(panel, label, onClick) {
  const row = document.createElement('div');
  row.className = 'control-row';
  row.innerHTML = `<button>${label}</button>`;
  const btn = row.querySelector('button');
  btn.style.flex = '1';
  btn.addEventListener('click', onClick);
  panel.appendChild(row);
  return btn;
}

function addHint(panel, text) {
  const p = document.createElement('p');
  p.className = 'hint';
  p.textContent = text;
  panel.appendChild(p);
}

// Expose publicly via a tiny namespace
window.AM = window.AM || {};
window.AM.Module1   = Module1;
window.AM.addSlider = addSlider;
window.AM.addSelect = addSelect;
window.AM.addButton = addButton;
window.AM.addHint   = addHint;
window.AM.drawReadouts = drawReadouts;
window.AM.drawOmegaArc = drawOmegaArc;

})();
