// simulations/angular-momentum/module1.js
//
// Module 1 — Conservation of angular momentum: rotating disc + sliding mass.
// I_disc = ½MR²,  I_mass = mr²,  I_total = I_disc + I_mass
// L = I_total·ω  (conserved when r changes, no external torques)

(function () {
'use strict';

class Module1 {
  constructor() {
    this.angle = 0;
    this.s = {
      M: 3.0, R: 1.5,      // disc mass (kg) and radius (m)
      m: 5.0, rFrac: 0.80, // sliding mass (kg) and position as fraction of R
      omega0: 1.0,          // reference ω that defines L
      omega: 1.0, I: 0, L: 0,
      running: true, speed: 1.0,
    };
    this._freezeL();
  }

  _r()       { return this.s.rFrac * this.s.R; }
  _discI()   { return 0.5 * this.s.M * this.s.R * this.s.R; }
  _massI()   { return this.s.m * this._r() * this._r(); }
  _totalI()  { return this._discI() + this._massI(); }

  _freezeL() {
    const s = this.s;
    s.I = this._totalI(); s.omega = s.omega0; s.L = s.I * s.omega;
  }

  _applyFrac(frac) {
    const s = this.s;
    s.rFrac = frac; s.I = this._totalI(); s.omega = s.I > 1e-9 ? s.L / s.I : 0;
  }

  init(ctx) {
    this.ctx = ctx;
    this.angle = 0;
    this._freezeL();
  }

  update(dt) {
    if (this.s.running) this.angle += this.s.omega * dt * this.s.speed;
  }

  render() {
    const ctx = this.ctx, s = this.s;
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const cx = W / 2, cy = H / 2;
    ctx.clearRect(0, 0, W, H);

    const r = this._r();
    const scale = Math.min(W, H) * 0.40 / s.R;
    const dPx = s.R * scale, mPx = r * scale;

    // Disc
    ctx.fillStyle = 'rgba(55,65,100,0.90)';
    ctx.beginPath(); ctx.arc(cx, cy, dPx, 0, Math.PI*2); ctx.fill();

    // Spokes
    ctx.strokeStyle = 'rgba(110,130,200,0.40)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 8; i++) {
      const a = this.angle + i * Math.PI / 4;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a)*dPx, cy + Math.sin(a)*dPx); ctx.stroke();
    }

    // Concentric rings
    for (const f of [0.25, 0.5, 0.75]) {
      ctx.strokeStyle = 'rgba(110,130,200,0.14)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(cx, cy, dPx*f, 0, Math.PI*2); ctx.stroke();
    }

    // Disc edge
    ctx.strokeStyle = 'rgba(100,130,220,0.65)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, dPx, 0, Math.PI*2); ctx.stroke();

    // Radial track for mass
    const ta = this.angle;
    ctx.save(); ctx.setLineDash([5,5]);
    ctx.strokeStyle = 'rgba(255,180,60,0.45)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(ta)*8, cy + Math.sin(ta)*8);
    ctx.lineTo(cx + Math.cos(ta)*dPx, cy + Math.sin(ta)*dPx);
    ctx.stroke(); ctx.setLineDash([]); ctx.restore();

    // Sliding mass — glow + core
    const mx = cx + Math.cos(ta)*mPx, my = cy + Math.sin(ta)*mPx;
    const grd = ctx.createRadialGradient(mx, my, 0, mx, my, 22);
    grd.addColorStop(0,    'rgba(255,165,50,0.95)');
    grd.addColorStop(0.45, 'rgba(255,120,30,0.50)');
    grd.addColorStop(1,    'rgba(255,100,20,0.00)');
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(mx, my, 22, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffb040';
    ctx.beginPath(); ctx.arc(mx, my, 7, 0, Math.PI*2); ctx.fill();

    // Tangential velocity arrow v = ω·r
    const v    = s.omega * s.r;
    const vDir = Math.sign(s.omega || 1);
    const perpA = ta + vDir * Math.PI/2;
    const vPx   = Math.min(v * scale * 0.22, dPx * 0.7);
    if (vPx > 4) {
      const vx = mx + Math.cos(perpA)*vPx, vy = my + Math.sin(perpA)*vPx;
      ctx.strokeStyle = 'rgba(255,230,90,0.85)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(vx, vy); ctx.stroke();
      const ha = Math.atan2(vy-my, vx-mx);
      ctx.fillStyle = 'rgba(255,230,90,0.85)';
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.lineTo(vx - 9*Math.cos(ha-0.42), vy - 9*Math.sin(ha-0.42));
      ctx.lineTo(vx - 9*Math.cos(ha+0.42), vy - 9*Math.sin(ha+0.42));
      ctx.closePath(); ctx.fill();
      ctx.font = '500 11px DM Sans, sans-serif';
      ctx.fillStyle = 'rgba(255,230,90,0.85)';
      ctx.fillText('v', vx + Math.cos(perpA)*10, vy + Math.sin(perpA)*10 + 4);
    }

    // Centre hub
    ctx.fillStyle = '#1a1e2e';
    ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#7080b0';
    ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2); ctx.fill();

    // ω arc and L symbol
    drawOmegaArc(ctx, cx, cy, 38, s.omega);
    drawLSymbol(ctx, cx, cy, s.omega);

    // Readouts
    ctx.font = '12px ui-monospace, Menlo, monospace';
    const rows = [
      ['L', s.L.toFixed(2),            'kg·m²/s', true],
      ['ω', s.omega.toFixed(2),         'rad/s'],
      ['I', s.I.toFixed(2),             'kg·m²'],
      ['v', (s.omega*r).toFixed(2),      'm/s'],
      ['r', r.toFixed(2),               'm'],
    ];
    let ty = 22;
    for (const [lbl, val, unit, gold] of rows) {
      ctx.fillStyle = gold ? '#ffd166' : '#c0c0c0';
      ctx.fillText(`${lbl} = ${val} ${unit}`, 14, ty); ty += 18;
    }
    ctx.font = '11px ui-monospace, Menlo, monospace';
    ctx.fillStyle = '#505060';
    ctx.fillText('top-down view · rotating frame', 14, H - 12);
  }

  buildControls(panel) {
    panel.innerHTML = '';
    const s = this.s;
    let playBtn = null;

    addSection(panel, 'Disc');
    addSlider(panel, 'Disc mass M', 'kg', 1, 30, 0.1, s.M,
      v => { s.M = v; this._applyFrac(s.rFrac); });
    addSlider(panel, 'Disc radius R', 'm', 0.5, 3, 0.05, s.R,
      v => { s.R = v; this._applyFrac(s.rFrac); });

    addSection(panel, 'Sliding mass');
    addSlider(panel, 'Mass m', 'kg', 0.1, 20, 0.1, s.m,
      v => { s.m = v; this._applyFrac(s.rFrac); });

    addSection(panel, 'Initial conditions');
    addSlider(panel, 'Angular velocity ω₀', 'rad/s', 0.2, 10, 0.1, s.omega0, v => {
      s.omega0 = v; this._freezeL(); this._applyFrac(s.rFrac);
    });

    addSection(panel, 'Radial position  ← move this');
    addSlider(panel, 'Position r / R', '', 0.05, 1.0, 0.01, s.rFrac,
      v => this._applyFrac(v), true);

    addSection(panel, 'Playback');
    addSlider(panel, 'Speed', '×', 0.1, 5, 0.1, s.speed, v => { s.speed = v; });

    const btnRow = document.createElement('div');
    btnRow.className = 'control-row'; btnRow.style.gap = '8px';

    playBtn = document.createElement('button');
    playBtn.textContent = 'Pause'; playBtn.style.flex = '1';
    playBtn.addEventListener('click', () => {
      s.running = !s.running; playBtn.textContent = s.running ? 'Pause' : 'Play';
    });

    const resetBtn = document.createElement('button');
    resetBtn.textContent = 'Reset'; resetBtn.style.flex = '1';
    resetBtn.addEventListener('click', () => {
      this.angle = 0; s.running = true; playBtn.textContent = 'Pause';
      this._freezeL(); this._applyFrac(s.rFrac);
    });

    btnRow.append(playBtn, resetBtn); panel.appendChild(btnRow);

    addHint(panel,
      'Move "Mass position r" inward → ω increases to conserve L.\n' +
      'I_disc = ½MR²   ·   I_mass = mr²   ·   L = (I_disc + I_mass)·ω');
  }
}

// ── Shared drawing helpers (used by other modules via window.AM) ────────────

function drawOmegaArc(ctx, cx, cy, radius, omega) {
  if (Math.abs(omega) < 0.01) return;
  const dir   = Math.sign(omega);
  const sweep = Math.min(Math.abs(omega) / 8, 1) * Math.PI * 1.6 + 0.5;
  ctx.strokeStyle = '#5fb3d4'; ctx.lineWidth = 2;
  ctx.beginPath();
  if (dir > 0) ctx.arc(cx, cy, radius, -Math.PI/2, -Math.PI/2 + sweep);
  else         ctx.arc(cx, cy, radius, -Math.PI/2, -Math.PI/2 - sweep, true);
  ctx.stroke();
  const endA = -Math.PI/2 + dir * sweep;
  const ex = cx + Math.cos(endA)*radius, ey = cy + Math.sin(endA)*radius;
  const tx = -Math.sin(endA)*dir,        ty =  Math.cos(endA)*dir;
  ctx.fillStyle = '#5fb3d4';
  ctx.beginPath();
  ctx.moveTo(ex + tx*8, ey + ty*8);
  ctx.lineTo(ex - ty*5, ey + tx*5);
  ctx.lineTo(ex + ty*5, ey - tx*5);
  ctx.closePath(); ctx.fill();
  ctx.font = 'bold 13px DM Sans, sans-serif';
  ctx.fillText('ω', cx + radius*0.7 + 4, cy - radius*0.7 - 4);
}

function drawLSymbol(ctx, cx, cy, omega) {
  const ox = cx - 38, oy = cy - 50, R = 13;
  ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 14;
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(ox, oy, R, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = '#ffd166';
  if (omega >= 0) {
    ctx.beginPath(); ctx.arc(ox, oy, 3.5, 0, Math.PI*2); ctx.fill();
  } else {
    const d = R * 0.55;
    ctx.lineWidth = 2.5; ctx.strokeStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(ox-d, oy-d); ctx.lineTo(ox+d, oy+d);
    ctx.moveTo(ox+d, oy-d); ctx.lineTo(ox-d, oy+d);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffd166'; ctx.font = 'bold 14px DM Sans, sans-serif';
  ctx.fillText('L', ox + R + 5, oy + 5);
}

function drawReadouts(ctx, lines) {
  ctx.font = '12px ui-monospace, Menlo, monospace';
  ctx.fillStyle = '#c0c0c0';
  let y = 22;
  for (const line of lines) { ctx.fillText(line, 14, y); y += 18; }
}

// ── Control-panel helpers (shared with other modules via window.AM) ─────────

function addSection(panel, title) {
  const el = document.createElement('div');
  el.className = 'section-label'; el.textContent = title; panel.appendChild(el);
}

function addSlider(panel, label, unit, min, max, step, value, onInput, primary = false) {
  const row = document.createElement('div');
  row.className = 'control-row' + (primary ? ' r-row' : '');
  const valStr = value.toFixed(value < 10 ? 2 : 1);
  row.innerHTML = `
    <span class="control-label">${label}</span>
    <input type="range" min="${min}" max="${max}" step="${step}" value="${value}"${primary ? ' class="primary"' : ''}>
    <span class="control-value">${valStr} ${unit}</span>`;
  const slider = row.querySelector('input'), valEl = row.querySelector('.control-value');
  slider.addEventListener('input', e => {
    const v = Number(e.target.value);
    valEl.textContent = `${v.toFixed(v < 10 ? 2 : 1)} ${unit}`;
    onInput(v);
  });
  panel.appendChild(row);
  return { slider, valEl };
}

function addSelect(panel, label, options, value, onChange) {
  const row = document.createElement('div'); row.className = 'control-row';
  const opts = options.map(o =>
    `<option value="${o.value}"${o.value === value ? ' selected' : ''}>${o.label}</option>`
  ).join('');
  row.innerHTML = `<span class="control-label">${label}</span><select>${opts}</select>`;
  const sel = row.querySelector('select');
  sel.addEventListener('change', e => onChange(e.target.value));
  panel.appendChild(row); return sel;
}

function addButton(panel, label, onClick) {
  const row = document.createElement('div'); row.className = 'control-row';
  row.innerHTML = `<button>${label}</button>`;
  const btn = row.querySelector('button'); btn.style.flex = '1';
  btn.addEventListener('click', onClick); panel.appendChild(row); return btn;
}

function addHint(panel, text) {
  const p = document.createElement('p'); p.className = 'hint';
  p.textContent = text; panel.appendChild(p);
}

// ── Exports ──────────────────────────────────────────────────────────────────

window.AM = window.AM || {};
window.AM.Module1      = Module1;
window.AM.addSlider    = addSlider;
window.AM.addSelect    = addSelect;
window.AM.addButton    = addButton;
window.AM.addHint      = addHint;
window.AM.addSection   = addSection;
window.AM.drawReadouts = drawReadouts;
window.AM.drawOmegaArc = drawOmegaArc;

})();
