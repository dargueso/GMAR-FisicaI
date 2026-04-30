// simulations/angular-momentum/module3.js
//
// Module 3 — Torque. τ = r × F = r · F · sin(θ).
// Side-view: pivot at left, lever arm extending right. The application point
// sits at distance r along the lever; a force vector at angle θ is shown.

(function () {
'use strict';

const PX_PER_M = 80;          // metres on the lever → pixels
const LEVER_LENGTH_M = 5;     // total lever length drawn

class Module3 {
  constructor() {
    this.s = PhysicsState.module3;
    this._update();
  }

  init(ctx) { this.ctx = ctx; this._update(); }

  _update() {
    this.s.tau = torqueFromRFTheta(this.s.r, this.s.F, deg2rad(this.s.theta));
  }

  setR(v)     { this.s.r     = v; this._update(); }
  setF(v)     { this.s.F     = v; this._update(); }
  setTheta(v) { this.s.theta = v; this._update(); }

  update(_dt) {}

  render() {
    const ctx = this.ctx;
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.clearRect(0, 0, W, H);

    const ax = W * 0.18;
    const ay = H * 0.55;
    const leverPx = LEVER_LENGTH_M * PX_PER_M;
    const rPx     = this.s.r * PX_PER_M;

    // Lever arm (faint)
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + leverPx, ay);
    ctx.stroke();

    // Highlighted moment-arm portion
    ctx.strokeStyle = '#5fb3d4';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(ax + rPx, ay);
    ctx.stroke();

    // Pivot
    ctx.fillStyle = '#eceff4';
    ctx.beginPath();
    ctx.arc(ax, ay, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(ax, ay, 12, 0, Math.PI * 2);
    ctx.stroke();

    // Application point
    const px = ax + rPx, py = ay;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.fill();

    // Force arrow at angle θ from the lever (CCW positive, drawn upward)
    const thetaRad = deg2rad(this.s.theta);
    const Fpx = (this.s.F / 20) * 200;     // scale: 20 N → 200 px
    const fx = Math.cos(thetaRad) * Fpx;
    const fy = -Math.sin(thetaRad) * Fpx;  // screen y-axis inverted
    drawArrow(ctx, px, py, px + fx, py + fy, '#ff6b6b', 'F');

    // Torque arc near the pivot — radius/sweep scale with τ
    drawTorqueArc(ctx, ax, ay, this.s.tau);

    // r label between pivot and application point
    ctx.fillStyle = '#5fb3d4';
    ctx.font = '12px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`r = ${this.s.r.toFixed(2)} m`, ax + rPx / 2, ay + 18);
    ctx.textAlign = 'left';

    // θ angle marker (small arc) at application point
    ctx.strokeStyle = 'rgba(255,209,102,0.7)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(px, py, 26, -thetaRad, 0, thetaRad < 0);
    ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.fillText(`θ = ${this.s.theta.toFixed(0)}°`,
                 px + 32 * Math.cos(-thetaRad / 2),
                 py + 32 * Math.sin(-thetaRad / 2));

    // Readouts
    AM.drawReadouts(ctx, [
      `r  = ${this.s.r.toFixed(2)} m`,
      `F  = ${this.s.F.toFixed(2)} N`,
      `θ  = ${this.s.theta.toFixed(0)}°`,
      `τ  = ${this.s.tau.toFixed(2)} N·m`,
    ]);

    // ΔL panel — torque acting for 1 s
    ctx.font = '12px ui-monospace, Menlo, monospace';
    ctx.fillStyle = '#c0c0c0';
    ctx.fillText(`ΔL over Δt = 1 s : ${this.s.tau.toFixed(2)} kg·m²/s`, 14, H - 16);
  }

  buildControls(panel) {
    panel.innerHTML = '';
    AM.addSlider(panel, 'Force', 'N', 0.1, 20, 0.1, this.s.F,
      v => this.setF(v));
    AM.addSlider(panel, 'Moment arm r', 'm', 0.1, 5, 0.01, this.s.r,
      v => this.setR(v));
    AM.addSlider(panel, 'Angle θ', '°', 0, 180, 1, this.s.theta,
      v => this.setTheta(v));
    AM.addHint(panel,
      'Maximum torque at θ = 90°; zero at 0° or 180° (force parallel to lever).\n' +
      'Marine context: tidal braking applies a small torque to Earth\'s rotation, ' +
      'lengthening the day over geological time.');
  }
}

function drawArrow(ctx, x0, y0, x1, y1, color, label) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 10;
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  const ang = Math.atan2(y1 - y0, x1 - x0);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - 12 * Math.cos(ang - 0.4), y1 - 12 * Math.sin(ang - 0.4));
  ctx.lineTo(x1 - 12 * Math.cos(ang + 0.4), y1 - 12 * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  if (label) {
    ctx.font = 'bold 14px DM Sans, sans-serif';
    ctx.fillText(label, x1 + 8, y1 - 6);
  }
  ctx.restore();
}

function drawTorqueArc(ctx, cx, cy, tau) {
  if (Math.abs(tau) < 1e-3) return;
  const dir = Math.sign(tau);
  const radius = 30 + Math.min(Math.abs(tau) * 4, 60);
  const sweep  = clamp(Math.abs(tau) / 100, 0.15, 1) * Math.PI * 1.4;
  ctx.save();
  ctx.shadowColor = '#a78bfa';
  ctx.shadowBlur = 10;
  ctx.strokeStyle = '#a78bfa';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (dir > 0) ctx.arc(cx, cy, radius, Math.PI, Math.PI - sweep, true);
  else         ctx.arc(cx, cy, radius, Math.PI, Math.PI + sweep);
  ctx.stroke();
  // Head
  const endA = Math.PI - dir * sweep;
  const ex = cx + Math.cos(endA) * radius;
  const ey = cy + Math.sin(endA) * radius;
  ctx.fillStyle = '#a78bfa';
  ctx.beginPath();
  ctx.arc(ex, ey, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#a78bfa';
  ctx.font = 'bold 14px DM Sans, sans-serif';
  ctx.fillText('τ', cx - radius - 18, cy - 6);
  ctx.restore();
}

window.AM = window.AM || {};
window.AM.Module3 = Module3;

})();
