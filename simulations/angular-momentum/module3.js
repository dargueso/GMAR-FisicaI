// simulations/angular-momentum/module3.js
//
// Module 3 — Torque. τ = r × F, with τ_z = r · F · sin(θ), θ = φF − φr.
// The pivot sits at the origin of an x–y frame (x right, y up). The position
// vector r and the force F each have their own angle measured from +x.
// Optional overlays show the moment arm r⊥ (distance from the pivot to the
// force's line of action) and F⊥ (the part of F perpendicular to r).
// Positive τ is counter-clockwise, i.e. out of the page.

(function () {
'use strict';

const R_MAX = 5;     // m  — largest r on the slider
const F_MAX = 20;    // N  — largest F on the slider

const C_R   = '#5fb3d4';
const C_F   = '#ff6b6b';
const C_TAU = '#a78bfa';
const C_RP  = '#7ee787';
const C_FP  = '#ffa657';
const DOTTED = [1, 6];   // with round caps → dots

// Wrap an angle in degrees to (−180, 180].
function wrap180(d) {
  let t = ((d % 360) + 360) % 360;
  if (t > 180) t -= 360;
  return t;
}

class Module3 {
  constructor() {
    this.s = PhysicsState.module3;
    this._update();
  }

  init(ctx) { this.ctx = ctx; this._update(); }

  _update() {
    const s = this.s;
    s.theta = wrap180(s.phiF - s.phiR);                       // angle from r to F
    s.tau   = torqueFromRFTheta(s.r, s.F, deg2rad(s.theta));  // CCW positive
  }

  setR(v)    { this.s.r    = v; this._update(); }
  setF(v)    { this.s.F    = v; this._update(); }
  setPhiR(v) { this.s.phiR = v; this._update(); }
  setPhiF(v) { this.s.phiF = v; this._update(); }

  update(_dt) {}

  render() {
    const ctx = this.ctx, s = this.s;
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.clearRect(0, 0, W, H);

    const S  = Math.min(W, H);
    const ox = W / 2, oy = H * 0.52;          // pivot = origin
    const sR = 0.27 * S / R_MAX;              // px per metre
    const sF = 0.19 * S / F_MAX;              // px per newton

    const a = deg2rad(s.phiR), b = deg2rad(s.phiF);
    // Screen-space unit vectors (canvas y points down, so negate sin).
    const ru = { x: Math.cos(a), y: -Math.sin(a) };
    const fu = { x: Math.cos(b), y: -Math.sin(b) };
    const rPx = s.r * sR, fPx = s.F * sF;
    const px = ox + ru.x * rPx, py = oy + ru.y * rPx;   // application point
    const fx = px + fu.x * fPx, fy = py + fu.y * fPx;   // tip of F
    const far = 2 * S;

    drawAxes(ctx, ox, oy, S);

    // ── r⊥ : moment arm ────────────────────────────────────────────────────
    if (s.showRperp) {
      // Dotted extension of the line of F (its line of action)
      dashedLine(ctx, px - fu.x * far, py - fu.y * far,
                      px + fu.x * far, py + fu.y * far, 'rgba(255,107,107,0.75)', DOTTED);
      // Foot of the perpendicular from the pivot onto that line
      const along = rPx * (ru.x * fu.x + ru.y * fu.y);
      const qx = px - fu.x * along, qy = py - fu.y * along;
      const len = Math.hypot(qx - ox, qy - oy);
      if (len > 2) {
        ctx.strokeStyle = C_RP; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(qx, qy); ctx.stroke();
        const u = { x: (ox - qx) / len, y: (oy - qy) / len };
        const sgn = along >= 0 ? 1 : -1;      // point the marker toward P
        drawRightAngle(ctx, qx, qy, u, { x: fu.x * sgn, y: fu.y * sgn }, C_RP);
        drawLabel(ctx, 'r⊥', (ox + qx) / 2 + u.y * 16, (oy + qy) / 2 - u.x * 16, C_RP);
      }
    }

    // ── F⊥ : component of F perpendicular to r ─────────────────────────────
    if (s.showFperp) {
      // Dotted extension of the line of r
      dashedLine(ctx, ox - ru.x * far, oy - ru.y * far,
                      ox + ru.x * far, oy + ru.y * far, 'rgba(95,179,212,0.75)', DOTTED);
      const par = fPx * (fu.x * ru.x + fu.y * ru.y);          // F∥ in px
      const ex = fu.x * fPx - ru.x * par, ey = fu.y * fPx - ru.y * par;
      const perpLen = Math.hypot(ex, ey);
      const tx = px + ex, ty = py + ey;                       // tip of F⊥
      const lx = px + ru.x * par, ly = py + ru.y * par;       // tip of F∥
      // Parallelogram closing lines
      dashedLine(ctx, tx, ty, fx, fy, 'rgba(255,166,87,0.55)');
      dashedLine(ctx, lx, ly, fx, fy, 'rgba(255,166,87,0.55)');
      if (Math.abs(par) > 3) {
        drawArrow(ctx, px, py, lx, ly, 'rgba(255,166,87,0.55)', null, 2);
        drawLabel(ctx, 'F∥', lx + ru.x * 14 * Math.sign(par),
                             ly + ru.y * 14 * Math.sign(par), 'rgba(255,166,87,0.8)');
      }
      if (perpLen > 3) {
        drawArrow(ctx, px, py, tx, ty, C_FP, null, 3);
        const eu = { x: ex / perpLen, y: ey / perpLen };
        const sgn = par >= 0 ? 1 : -1;
        drawRightAngle(ctx, px, py, { x: ru.x * sgn, y: ru.y * sgn }, eu, C_FP);
        drawLabel(ctx, 'F⊥', tx + eu.x * 16, ty + eu.y * 16, C_FP);
      }
    }

    // ── r and F vectors ────────────────────────────────────────────────────
    drawArrow(ctx, ox, oy, px, py, C_R, null, 3);
    drawLabel(ctx, 'r', (ox + px) / 2 - ru.y * 14, (oy + py) / 2 + ru.x * 14, C_R);
    drawArrow(ctx, px, py, fx, fy, C_F, null, 3);
    drawLabel(ctx, 'F', fx + fu.x * 14, fy + fu.y * 14, C_F);

    // ── Angles from +x ─────────────────────────────────────────────────────
    drawAngleArc(ctx, ox, oy, 46, s.phiR, C_R, 'r', false);
    drawAngleArc(ctx, px, py, 30, s.phiF, C_F, 'F', true);

    // ── Torque direction around the pivot ──────────────────────────────────
    drawTorqueArc(ctx, ox, oy, s.tau, a);

    // Pivot and application point
    ctx.fillStyle = '#eceff4';
    ctx.beginPath(); ctx.arc(ox, oy, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();

    // ── Readouts ───────────────────────────────────────────────────────────
    const sense = s.tau > 1e-3 ? '  ⊙ counter-clockwise'
                : s.tau < -1e-3 ? '  ⊗ clockwise' : '';
    const sinT = Math.sin(deg2rad(s.theta));
    const rows = [
      [`r = ${s.r.toFixed(2)} m    φr = ${s.phiR.toFixed(0)}°`, C_R],
      [`F = ${s.F.toFixed(2)} N   φF = ${s.phiF.toFixed(0)}°`, C_F],
      [`θ = φF − φr = ${s.theta.toFixed(0)}°`, '#c0c0c0'],
      [`τ = r·F·sin θ = ${s.tau.toFixed(2)} N·m${sense}`, C_TAU],
    ];
    if (s.showRperp) {
      rows.push([`r⊥ = r·|sin θ| = ${(s.r * Math.abs(sinT)).toFixed(2)} m   (|τ| = r⊥·F)`, C_RP]);
    }
    if (s.showFperp) {
      rows.push([`F⊥ = F·sin θ = ${(s.F * sinT).toFixed(2)} N   (τ = r·F⊥)`, C_FP]);
    }
    ctx.font = '12px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'left';
    let y = 22;
    for (const [text, color] of rows) {
      ctx.fillStyle = color; ctx.fillText(text, 14, y); y += 18;
    }

    // ΔL panel — torque acting for 1 s
    ctx.fillStyle = '#c0c0c0';
    ctx.fillText(`ΔL over Δt = 1 s : ${s.tau.toFixed(2)} kg·m²/s`, 14, H - 16);
  }

  buildControls(panel) {
    panel.innerHTML = '';
    const s = this.s;

    AM.addSection(panel, 'Position vector r');
    AM.addSlider(panel, 'Magnitude r', 'm', 0.1, R_MAX, 0.01, s.r, v => this.setR(v));
    AM.addSlider(panel, 'Angle φr from +x', '°', 0, 360, 1, s.phiR, v => this.setPhiR(v));

    AM.addSection(panel, 'Force F');
    AM.addSlider(panel, 'Magnitude F', 'N', 0.1, F_MAX, 0.1, s.F, v => this.setF(v));
    AM.addSlider(panel, 'Angle φF from +x', '°', 0, 360, 1, s.phiF, v => this.setPhiF(v));

    AM.addSection(panel, 'Show components');
    const row = document.createElement('div');
    row.className = 'control-row';
    row.style.gap = '8px';
    const toggle = (label, key) => {
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.style.flex = '1';
      btn.classList.toggle('active', !!s[key]);
      btn.addEventListener('click', () => {
        s[key] = !s[key];
        btn.classList.toggle('active', s[key]);
      });
      row.appendChild(btn);
    };
    toggle('r⊥  (moment arm)', 'showRperp');
    toggle('F⊥  (perpendicular force)', 'showFperp');
    panel.appendChild(row);

    AM.addHint(panel,
      'τ = r·F·sin θ, where θ = φF − φr is the angle from r to F. ' +
      'Positive τ is counter-clockwise (out of the page).\n' +
      'r⊥ is the distance from the pivot to the force\'s line of action; ' +
      'F⊥ is the part of F perpendicular to r.  τ = r⊥·F = r·F⊥.\n' +
      'Marine context: tidal braking applies a small torque to Earth\'s rotation, ' +
      'lengthening the day over geological time.');
  }
}

// ── Drawing helpers ─────────────────────────────────────────────────────────

function drawAxes(ctx, ox, oy, S) {
  const xh = 0.46 * S, up = 0.46 * S, down = 0.40 * S;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.fillStyle   = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ox - xh, oy); ctx.lineTo(ox + xh, oy);
  ctx.moveTo(ox, oy + down); ctx.lineTo(ox, oy - up);
  ctx.stroke();
  // Arrowheads on +x and +y
  ctx.beginPath();
  ctx.moveTo(ox + xh, oy); ctx.lineTo(ox + xh - 9, oy - 4); ctx.lineTo(ox + xh - 9, oy + 4);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(ox, oy - up); ctx.lineTo(ox - 4, oy - up + 9); ctx.lineTo(ox + 4, oy - up + 9);
  ctx.closePath(); ctx.fill();
  ctx.font = 'italic 14px DM Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('x', ox + xh - 6, oy + 18);
  ctx.fillText('y', ox - 14, oy - up + 10);
  ctx.restore();
}

function dashedLine(ctx, x0, y0, x1, y1, color, pattern) {
  ctx.save();
  ctx.setLineDash(pattern || [6, 5]);
  ctx.lineCap = pattern ? 'round' : 'butt';
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.restore();
}

function drawArrow(ctx, x0, y0, x1, y1, color, label, width) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const head = Math.min(12, Math.max(5, len * 0.5));
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.strokeStyle = color;
  ctx.lineWidth = width || 3;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  const ang = Math.atan2(y1 - y0, x1 - x0);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - head * Math.cos(ang - 0.4), y1 - head * Math.sin(ang - 0.4));
  ctx.lineTo(x1 - head * Math.cos(ang + 0.4), y1 - head * Math.sin(ang + 0.4));
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  if (label) {
    ctx.font = 'bold 14px DM Sans, sans-serif';
    ctx.fillText(label, x1 + 8, y1 - 6);
  }
  ctx.restore();
}

function drawLabel(ctx, text, x, y, color) {
  ctx.save();
  ctx.font = 'bold 14px DM Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// Small square marking a right angle at (x, y) between unit vectors u and v.
function drawRightAngle(ctx, x, y, u, v, color) {
  const k = 9;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + u.x * k, y + u.y * k);
  ctx.lineTo(x + (u.x + v.x) * k, y + (u.y + v.y) * k);
  ctx.lineTo(x + v.x * k, y + v.y * k);
  ctx.stroke();
  ctx.restore();
}

// Arc from the +x direction counter-clockwise to `deg`, labelled φ_sub = deg°.
function drawAngleArc(ctx, x, y, radius, deg, color, sub, withReference) {
  ctx.save();
  if (withReference) {
    // Local line parallel to the x axis to measure the angle from.
    dashedLine(ctx, x, y, x + radius + 18, y, 'rgba(255,255,255,0.35)');
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  if (deg > 0.5) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, -deg2rad(deg), true);   // counter-clockwise on screen
    ctx.stroke();
  }
  // Label: "φ" + subscript + value, centred on the arc's mid-angle.
  const mid = deg2rad(deg / 2);
  const lx = x + Math.cos(mid) * (radius + 26);
  const ly = y - Math.sin(mid) * (radius + 26);
  const mainFont = '12px ui-monospace, Menlo, monospace';
  const subFont  = '9px ui-monospace, Menlo, monospace';
  const tail = ` = ${deg.toFixed(0)}°`;
  ctx.font = mainFont; const w1 = ctx.measureText('φ').width, w3 = ctx.measureText(tail).width;
  ctx.font = subFont;  const w2 = ctx.measureText(sub).width;
  let tx = lx - (w1 + w2 + w3) / 2;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = mainFont; ctx.fillText('φ', tx, ly);        tx += w1;
  ctx.font = subFont;  ctx.fillText(sub, tx, ly + 4);    tx += w2;
  ctx.font = mainFont; ctx.fillText(tail, tx, ly);
  ctx.restore();
}

// Curved arrow around the pivot showing the sense of τ (CCW for τ > 0).
// It is centred on the side opposite to r so that r passes through its gap.
function drawTorqueArc(ctx, cx, cy, tau, phiR) {
  if (Math.abs(tau) < 1e-3) return;
  const dir    = Math.sign(tau);
  const radius = 24;
  const sweep  = clamp(Math.abs(tau) / (R_MAX * F_MAX), 0.2, 1) * Math.PI * 1.5;
  const c      = -(phiR + Math.PI);          // canvas angle opposite to r
  const a0 = c + dir * sweep / 2;            // canvas angles decrease going CCW
  const a1 = c - dir * sweep / 2;
  ctx.save();
  ctx.shadowColor = C_TAU;
  ctx.shadowBlur = 8;
  ctx.strokeStyle = C_TAU;
  ctx.fillStyle = C_TAU;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, a0, a1, dir > 0);
  ctx.stroke();
  // Arrowhead at the end, pointing along the direction of travel
  const ex = cx + Math.cos(a1) * radius, ey = cy + Math.sin(a1) * radius;
  const tx =  Math.sin(a1) * dir, ty = -Math.cos(a1) * dir;
  ctx.beginPath();
  ctx.moveTo(ex + tx * 9, ey + ty * 9);
  ctx.lineTo(ex - ty * 5, ey + tx * 5);
  ctx.lineTo(ex + ty * 5, ey - tx * 5);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = 'bold 14px DM Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('τ', cx + Math.cos(c) * (radius + 14), cy + Math.sin(c) * (radius + 14));
  ctx.restore();
}

window.AM = window.AM || {};
window.AM.Module3 = Module3;

})();
