// simulations/angular-momentum/integrated.js
//
// Module 4 — Integrated ocean-gyre scenario. Wind stress applies a torque,
// gyre radius controls I (solid-disc model: I = ½ M R²), and angular momentum
// L is the integrated state: dL/dt = τ. Angular velocity is ω = L / I.
//
// Units are normalised — the goal is the qualitative coupling, not realism.

(function () {
'use strict';

const HISTORY_SECONDS = 30;       // chart x-axis span
const SAMPLE_INTERVAL = 0.05;     // seconds between recorded samples
const PX_PER_UNIT = 70;           // normalised radius units → screen pixels

class Module4 {
  constructor() {
    this.s = PhysicsState.module4;
    this.history = [];           // [{t, L}]
    this.angle = 0;
    this.timeScale = 1;
    this.running = false;
    this._refreshI();
  }

  init(ctx) {
    this.ctx = ctx;
    this.angle = 0;
    this.history = [];
    this.s.t = 0;
    this.s.L = 0;
    this.s.omega = 0;
    this.running = true;
    this._refreshI();
  }

  _refreshI() {
    // Solid-disc gyre: I = ½ M R²
    this.s.I = 0.5 * this.s.mass * this.s.radius * this.s.radius;
    this.s.omega = this.s.I > 0 ? this.s.L / this.s.I : 0;
  }

  setTau(v)    { this.s.tau    = v; }
  setRadius(v) { this.s.radius = v; this._refreshI(); }
  setMass(v)   { this.s.mass   = v; this._refreshI(); }
  setRunning(b){ this.running = b; }
  setTimeScale(v) { this.timeScale = v; }
  reset() {
    this.s.L = 0;
    this.s.t = 0;
    this.angle = 0;
    this.history = [];
    this._refreshI();
  }

  update(dt) {
    if (!this.running) return;
    const scaled = dt * this.timeScale;
    this.s.L += this.s.tau * scaled;
    this.s.omega = this.s.I > 0 ? this.s.L / this.s.I : 0;
    this.angle += this.s.omega * scaled;
    this.s.t += scaled;
    if (!this.history.length || this.s.t - this.history[this.history.length - 1].t >= SAMPLE_INTERVAL) {
      this.history.push({ t: this.s.t, L: this.s.L });
      const cutoff = this.s.t - HISTORY_SECONDS;
      while (this.history.length && this.history[0].t < cutoff) this.history.shift();
    }
  }

  render() {
    const ctx = this.ctx;
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Top region: gyre. Bottom region: chart.
    const chartH = 110;
    const sceneH = H - chartH;
    const cx = W / 2, cy = sceneH / 2;
    const rPx = clamp(this.s.radius * PX_PER_UNIT, 30, Math.min(W, sceneH) * 0.42);

    drawGyre(ctx, cx, cy, rPx, this.angle, this.s.omega, this.s.tau);

    // Readouts (normalised units for educational clarity)
    AM.drawReadouts(ctx, [
      `t  = ${this.s.t.toFixed(2)} s`,
      `τ  = ${this.s.tau.toFixed(2)} N·m`,
      `R  = ${this.s.radius.toFixed(2)} m`,
      `M  = ${this.s.mass.toFixed(2)} kg`,
      `I  = ${this.s.I.toFixed(2)} kg·m²`,
      `L  = ${this.s.L.toFixed(2)} kg·m²/s`,
      `ω  = ${this.s.omega.toFixed(2)} rad/s`,
    ]);

    // Chart of L(t)
    drawHistoryChart(ctx, 0, sceneH, W, chartH, this.history, this.s.t);
  }

  buildControls(panel) {
    panel.innerHTML = '';
    AM.addSlider(panel, 'Wind stress τ', 'N·m', -5, 5, 0.1, this.s.tau,
      v => this.setTau(v));
    AM.addSlider(panel, 'Gyre radius', 'm', 1, 5, 0.01, this.s.radius,
      v => this.setRadius(v));
    AM.addSlider(panel, 'Mass', 'kg', 1, 20, 0.1, this.s.mass,
      v => this.setMass(v));
    AM.addSlider(panel, 'Time scale', '×', 0.1, 5, 0.1, this.timeScale,
      v => this.setTimeScale(v));

    const row = document.createElement('div');
    row.className = 'control-row';
    row.style.gap = '8px';
    const playPause = document.createElement('button');
    playPause.textContent = this.running ? 'Pause' : 'Play';
    playPause.style.flex = '1';
    playPause.addEventListener('click', () => {
      this.setRunning(!this.running);
      playPause.textContent = this.running ? 'Pause' : 'Play';
    });
    const reset = document.createElement('button');
    reset.textContent = 'Reset';
    reset.style.flex = '1';
    reset.addEventListener('click', () => this.reset());
    row.appendChild(playPause);
    row.appendChild(reset);
    panel.appendChild(row);

    AM.addHint(panel,
      'Apply wind stress → L grows. Then shrink the gyre radius and watch ω spike.\n' +
      'Mass-redistribution lowers I, ω = L / I jumps even though L barely moved.');
  }
}

// ── Drawing ────────────────────────────────────────────────────────────────

function drawGyre(ctx, cx, cy, rPx, angle, omega, tau) {
  // Outer ring
  ctx.strokeStyle = 'rgba(95,179,212,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, rPx, 0, Math.PI * 2);
  ctx.stroke();

  // Streamlines: spirals
  const arms = 6;
  ctx.lineWidth = 2;
  for (let i = 0; i < arms; i++) {
    const phase = angle + (i * 2 * Math.PI) / arms;
    ctx.strokeStyle = `rgba(${95 + i*15},${179 - i*5},212,0.6)`;
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.02) {
      const r = rPx * t;
      const a = phase + t * Math.PI * 1.4;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (t === 0) ctx.moveTo(x, y);
      else         ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Centre point
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  ctx.arc(cx, cy, 4, 0, Math.PI * 2);
  ctx.fill();

  // Wind-stress arrows around the rim, sized with τ
  if (Math.abs(tau) > 0) {
    const N = 8;
    const arrowLen = clamp(Math.abs(tau) / 5 * 40, 6, 40);
    ctx.strokeStyle = '#ff9966';
    ctx.fillStyle   = '#ff9966';
    ctx.lineWidth = 2;
    for (let i = 0; i < N; i++) {
      const a = (i * 2 * Math.PI) / N;
      const x = cx + Math.cos(a) * (rPx + 14);
      const y = cy + Math.sin(a) * (rPx + 14);
      const tx = -Math.sin(a) * Math.sign(tau);
      const ty =  Math.cos(a) * Math.sign(tau);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + tx * arrowLen, y + ty * arrowLen);
      ctx.stroke();
    }
  }

  // ω indicator
  AM.drawOmegaArc(ctx, cx, cy, Math.min(rPx * 0.25, 32), omega);
}

function drawHistoryChart(ctx, x, y, w, h, history, tNow) {
  // Background
  ctx.fillStyle = 'rgba(255,255,255,0.03)';
  ctx.fillRect(x, y, w, h);
  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.stroke();

  ctx.fillStyle = '#c0c0c0';
  ctx.font = '11px ui-monospace, Menlo, monospace';
  ctx.fillText('L(t)', x + 8, y + 14);

  if (history.length < 2) return;

  // Scale
  let lMin = Infinity, lMax = -Infinity;
  for (const p of history) { if (p.L < lMin) lMin = p.L; if (p.L > lMax) lMax = p.L; }
  if (lMax === lMin) { lMax = lMin + 1; }
  const tMin = Math.max(0, tNow - HISTORY_SECONDS);
  const tMax = tMin + HISTORY_SECONDS;
  const padTop = 22, padBot = 12, padX = 40;
  const plotW = w - padX - 12, plotH = h - padTop - padBot;

  // Zero line
  if (lMin < 0 && lMax > 0) {
    const yZero = y + padTop + plotH * (lMax / (lMax - lMin));
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.moveTo(x + padX, yZero);
    ctx.lineTo(x + padX + plotW, yZero);
    ctx.stroke();
  }

  // Polyline
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < history.length; i++) {
    const p = history[i];
    const px = x + padX + ((p.t - tMin) / (tMax - tMin)) * plotW;
    const py = y + padTop + (1 - (p.L - lMin) / (lMax - lMin)) * plotH;
    if (i === 0) ctx.moveTo(px, py);
    else         ctx.lineTo(px, py);
  }
  ctx.stroke();

  // y-axis range labels
  ctx.fillStyle = '#c0c0c0';
  ctx.fillText(lMax.toFixed(2), x + 4, y + padTop + 4);
  ctx.fillText(lMin.toFixed(2), x + 4, y + padTop + plotH);
}

window.AM = window.AM || {};
window.AM.Module4 = Module4;

})();
