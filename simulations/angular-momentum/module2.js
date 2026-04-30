// simulations/angular-momentum/module2.js
//
// Module 2 — Moment of inertia. Two side-by-side rotors with the same mass
// and outer radius; identical torque is applied; α = τ/I diverges.

(function () {
'use strict';

const PX_PER_M = 60;

class Module2 {
  constructor() {
    this.s = PhysicsState.module2;
    this.angleA = 0;
    this.angleB = 0;
    this.applying = false;
    this._refreshI();
  }

  init(ctx) {
    this.ctx = ctx;
    this.angleA = 0;
    this.angleB = 0;
    this.s.omegaA = 0;
    this.s.omegaB = 0;
    this._refreshI();
  }

  _refreshI() {
    this.s.IA = inertiaOf(this.s.shapeA, this.s.mass, this.s.radius);
    this.s.IB = inertiaOf(this.s.shapeB, this.s.mass, this.s.radius);
  }

  setMass(m)    { this.s.mass   = m; this._refreshI(); }
  setRadius(r)  { this.s.radius = r; this._refreshI(); }
  setTorque(t)  { this.s.torque = t; }
  setShapeA(s)  { this.s.shapeA = s; this._refreshI(); }
  setShapeB(s)  { this.s.shapeB = s; this._refreshI(); }
  setApplying(on) { this.applying = on; }
  reset() {
    this.s.omegaA = 0; this.s.omegaB = 0;
    this.angleA = 0;   this.angleB = 0;
    this.s.alphaA = 0; this.s.alphaB = 0;
  }

  update(dt) {
    if (this.applying) {
      this.s.alphaA = this.s.torque / Math.max(this.s.IA, 1e-9);
      this.s.alphaB = this.s.torque / Math.max(this.s.IB, 1e-9);
    } else {
      this.s.alphaA = 0;
      this.s.alphaB = 0;
    }
    this.s.omegaA += this.s.alphaA * dt;
    this.s.omegaB += this.s.alphaB * dt;
    this.angleA   += this.s.omegaA * dt;
    this.angleB   += this.s.omegaB * dt;
  }

  render() {
    const ctx = this.ctx;
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.clearRect(0, 0, W, H);

    drawRotor(ctx, W * 0.27, H * 0.5, this.s.radius * PX_PER_M,
              this.angleA, this.s.shapeA, '#ff9966');
    drawRotor(ctx, W * 0.73, H * 0.5, this.s.radius * PX_PER_M,
              this.angleB, this.s.shapeB, '#5fb3d4');

    // Labels
    ctx.fillStyle = '#eceff4';
    ctx.font = '600 14px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(SHAPE_LABELS[this.s.shapeA], W * 0.27, H * 0.5 + this.s.radius * PX_PER_M + 32);
    ctx.fillText(SHAPE_LABELS[this.s.shapeB], W * 0.73, H * 0.5 + this.s.radius * PX_PER_M + 32);
    ctx.textAlign = 'left';

    // Per-rotor readouts
    const linesA = [
      `I  = ${this.s.IA.toFixed(2)} kg·m²`,
      `α  = ${this.s.alphaA.toFixed(2)} rad/s²`,
      `ω  = ${this.s.omegaA.toFixed(2)} rad/s`,
    ];
    const linesB = [
      `I  = ${this.s.IB.toFixed(2)} kg·m²`,
      `α  = ${this.s.alphaB.toFixed(2)} rad/s²`,
      `ω  = ${this.s.omegaB.toFixed(2)} rad/s`,
    ];
    ctx.font = '12px ui-monospace, Menlo, monospace';
    ctx.fillStyle = '#c0c0c0';
    linesA.forEach((l, i) => ctx.fillText(l, 14, 22 + i*18));
    linesB.forEach((l, i) => ctx.fillText(l, W - 180, 22 + i*18));

    // Status line
    ctx.fillStyle = this.applying ? '#ffd166' : '#6b7280';
    ctx.font = '600 13px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.applying ? `Applying τ = ${this.s.torque.toFixed(2)} N·m`
                               : 'Idle — press Apply torque',
                 W / 2, H - 16);
    ctx.textAlign = 'left';
  }

  buildControls(panel) {
    panel.innerHTML = '';
    const opts = Object.entries(SHAPE_LABELS).map(([v, l]) => ({ value: v, label: l }));
    AM.addSelect(panel, 'Shape A', opts, this.s.shapeA, v => this.setShapeA(v));
    AM.addSelect(panel, 'Shape B', opts, this.s.shapeB, v => this.setShapeB(v));
    AM.addSlider(panel, 'Total mass', 'kg', 1, 20, 0.1, this.s.mass,
      v => this.setMass(v));
    AM.addSlider(panel, 'Radius', 'm', 0.5, 3, 0.01, this.s.radius,
      v => this.setRadius(v));
    AM.addSlider(panel, 'Torque', 'N·m', 0.1, 10, 0.1, this.s.torque,
      v => this.setTorque(v));

    const row = document.createElement('div');
    row.className = 'control-row';
    row.style.gap = '8px';
    const apply = document.createElement('button');
    apply.textContent = this.applying ? 'Stop torque' : 'Apply torque';
    if (this.applying) apply.classList.add('active');
    apply.style.flex = '1';
    apply.addEventListener('click', () => {
      this.setApplying(!this.applying);
      apply.textContent = this.applying ? 'Stop torque' : 'Apply torque';
      apply.classList.toggle('active', this.applying);
    });
    const reset = document.createElement('button');
    reset.textContent = 'Reset spin';
    reset.style.flex = '1';
    reset.addEventListener('click', () => {
      this.reset();
      this.setApplying(false);
      apply.textContent = 'Apply torque';
      apply.classList.remove('active');
    });
    row.appendChild(apply);
    row.appendChild(reset);
    panel.appendChild(row);

    AM.addHint(panel,
      'Click "Apply torque" to spin both rotors with the same τ. Lower I spins up faster.\n' +
      'Marine context: a massive ocean gyre changes rotation slowly; a small eddy spins up fast.');
  }
}

// ── Shape rendering ─────────────────────────────────────────────────────────

function drawRotor(ctx, cx, cy, rPx, angle, shape, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angle);

  // glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;

  switch (shape) {
    case 'disc': {
      const grd = ctx.createRadialGradient(0, 0, rPx * 0.1, 0, 0, rPx);
      grd.addColorStop(0, color + 'ff');
      grd.addColorStop(1, color + '22');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(0, 0, rPx, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, rPx, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case 'ring': {
      ctx.lineWidth = Math.max(4, rPx * 0.08);
      ctx.beginPath(); ctx.arc(0, 0, rPx, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case 'point': {
      ctx.beginPath(); ctx.arc(0, 0, rPx, 0, Math.PI * 2); ctx.stroke(); // outline ghost
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(rPx, 0, 10, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case 'rod': {
      ctx.beginPath(); ctx.arc(0, 0, rPx, 0, Math.PI * 2); ctx.stroke(); // ghost ring
      ctx.lineWidth = Math.max(6, rPx * 0.12);
      ctx.beginPath();
      ctx.moveTo(-rPx, 0);
      ctx.lineTo( rPx, 0);
      ctx.stroke();
      break;
    }
    case 'sphere': {
      // Filled body with off-centre radial highlight to read as a 3D ball.
      const grd = ctx.createRadialGradient(-rPx*0.35, -rPx*0.35, rPx*0.05,
                                            0, 0, rPx);
      grd.addColorStop(0,    '#ffffff');
      grd.addColorStop(0.25, color + 'ff');
      grd.addColorStop(1,    color + '22');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(0, 0, rPx, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(0, 0, rPx, 0, Math.PI * 2); ctx.stroke();
      // Equator hint to differentiate from the flat disc
      ctx.lineWidth = 1;
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 0, rPx, rPx * 0.18, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'shell': {
      // Outer rim plus equator + meridian arcs to read as a hollow 3D shell.
      ctx.lineWidth = Math.max(3, rPx * 0.05);
      ctx.beginPath(); ctx.arc(0, 0, rPx, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, rPx, rPx * 0.25, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, rPx * 0.25, rPx, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }

  // marker line so rotation is visible
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(rPx, 0);
  ctx.stroke();

  ctx.restore();
}

window.AM = window.AM || {};
window.AM.Module2 = Module2;

})();
