// campo_gravitatorio/scene.js

const PAD_L  = 72;   // shared left padding for aligned x-axes
const PAD_R  = 20;
const PAD_T  = 16;
const PAD_B  = 36;
const X_MAX_R = 5;   // plot up to 5R

function isDarkMode() {
  return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

function palette() {
  const d = isDarkMode();
  return {
    bg:           d ? '#222831' : '#ffffff',
    axis:         d ? '#7a8595' : '#5a6776',
    grid:         d ? '#3b4252' : '#e2e8f0',
    text:         d ? '#d0d8e4' : '#1f2937',
    muted:        d ? '#8f9ba8' : '#6b7280',
    sphereFill:   d ? '#1a3a4a' : '#d4eef4',
    sphereStroke: d ? '#5fb3d4' : '#2d7d9a',
    gColor:       d ? '#5fb3d4' : '#2d7d9a',
    vColor:       d ? '#e07a5f' : '#c05a40',
    cursor:       d ? '#d4a23c' : '#b8860b',
  };
}

function setupCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const W   = canvas.clientWidth;
  const H   = canvas.clientHeight;
  if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, W, H);
  return { ctx, W, H };
}

function niceStep(range, n) {
  if (range <= 0) return 1;
  const t   = range / (n || 5);
  const exp = Math.floor(Math.log10(t));
  const b   = t / Math.pow(10, exp);
  return (b < 1.5 ? 1 : b < 3 ? 2 : b < 7 ? 5 : 10) * Math.pow(10, exp);
}

function fmtVal(v) {
  if (v === 0) return '0';
  const a = Math.abs(v), s = v < 0 ? '−' : '';
  const trim = str => str.replace(/\.?0+$/, '');
  if (a >= 1e9) return s + trim((a / 1e9).toPrecision(3)) + 'G';
  if (a >= 1e6) return s + trim((a / 1e6).toPrecision(3)) + 'M';
  if (a >= 1e3) return s + trim((a / 1e3).toPrecision(3)) + 'k';
  if (a >= 100) return s + a.toFixed(0);
  if (a >= 10)  return s + trim(a.toFixed(1));
  if (a >= 1)   return s + trim(a.toFixed(2));
  if (a >= 0.1) return s + trim(a.toFixed(3));
  return v.toExponential(2);
}

// ─── TOP CANVAS: sphere cross-section ────────────────────────────────────────

function renderSphere(canvas, M, R, hoverR) {
  const { ctx, W, H } = setupCanvas(canvas);
  const c = palette();

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);

  const plotW  = W - PAD_L - PAD_R;
  const plotH  = H - PAD_T - PAD_B;
  const baseY  = PAD_T + plotH;          // x-axis y position
  const originX = PAD_L;                 // r = 0

  // One R in pixels
  const Rpx = plotW / X_MAX_R;

  // Clip to plot area
  ctx.save();
  ctx.beginPath();
  ctx.rect(PAD_L, PAD_T, plotW, plotH);
  ctx.clip();

  // Sphere interior: filled quarter-circle (upper right, as r goes right and y goes up)
  ctx.beginPath();
  ctx.moveTo(originX, baseY);
  ctx.arc(originX, baseY, Rpx, -Math.PI / 2, 0);
  ctx.closePath();
  ctx.fillStyle = c.sphereFill;
  ctx.fill();

  // Sphere surface arc
  ctx.beginPath();
  ctx.arc(originX, baseY, Rpx, -Math.PI / 2, 0);
  ctx.strokeStyle = c.sphereStroke;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Interior label
  ctx.fillStyle = c.sphereStroke;
  ctx.font = '11px DM Sans, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('interior', originX + Rpx * 0.45, baseY - Rpx * 0.35);

  // Exterior label
  ctx.fillStyle = c.muted;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText('exterior', originX + Rpx + 8, PAD_T + 6);

  // Field arrows (pointing toward center = left) at sample r values
  const gSurf    = G * M / (R * R);
  const maxArrow = Math.min(Rpx * 0.50, 36);
  [0.30, 0.65, 1.55, 2.5, 3.5, 4.45].forEach(frac => {
    const r    = frac * R;
    const x    = originX + (r / (X_MAX_R * R)) * plotW;
    const gVal = gravField(r, M, R);
    const len  = maxArrow * (gVal / gSurf);
    if (len < 3 || x - len < PAD_L) return;
    const isIn = r <= R;
    const col  = isIn ? c.gColor : c.vColor;
    ctx.strokeStyle = col;
    ctx.lineWidth   = 1.8;
    ctx.beginPath();
    ctx.moveTo(x, baseY - 22);
    ctx.lineTo(x - len, baseY - 22);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - len, baseY - 22);
    ctx.lineTo(x - len + 7, baseY - 26);
    ctx.lineTo(x - len + 7, baseY - 18);
    ctx.closePath();
    ctx.fillStyle = col;
    ctx.fill();
  });

  ctx.restore();

  // x-axis line
  ctx.strokeStyle = c.axis;
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD_L, baseY);
  ctx.lineTo(PAD_L + plotW, baseY);
  ctx.stroke();

  // Vertical dashed line at r = R
  const xR = PAD_L + Rpx;
  ctx.strokeStyle = c.sphereStroke;
  ctx.lineWidth   = 1;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(xR, PAD_T);
  ctx.lineTo(xR, baseY);
  ctx.stroke();
  ctx.setLineDash([]);

  // x-axis ticks + labels (shared scale with the graphs below)
  ctx.fillStyle    = c.muted;
  ctx.font         = '11px DM Sans, system-ui, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= X_MAX_R; i++) {
    const x   = PAD_L + (i / X_MAX_R) * plotW;
    const lbl = i === 0 ? '0' : i === 1 ? 'R' : `${i}R`;
    ctx.strokeStyle = c.muted;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(x, baseY - 3);
    ctx.lineTo(x, baseY + 3);
    ctx.stroke();
    ctx.fillStyle = c.muted;
    ctx.fillText(lbl, x, baseY + 5);
  }

  // Origin dot + label
  ctx.fillStyle = c.axis;
  ctx.beginPath();
  ctx.arc(PAD_L, baseY, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle    = c.text;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'bottom';
  ctx.font         = '12px DM Sans, system-ui, sans-serif';
  ctx.fillText('O', PAD_L + 5, baseY - 6);

  // Hover cursor
  if (hoverR != null) {
    const hx = PAD_L + (Math.min(hoverR, X_MAX_R * R) / (X_MAX_R * R)) * plotW;
    ctx.strokeStyle = c.cursor;
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(hx, PAD_T);
    ctx.lineTo(hx, baseY);
    ctx.stroke();
    ctx.setLineDash([]);
    // r/R label
    const rR = hoverR / R;
    ctx.fillStyle    = c.cursor;
    ctx.textAlign    = rR > X_MAX_R * 0.6 ? 'right' : 'left';
    ctx.textBaseline = 'top';
    ctx.font         = '10px DM Sans, system-ui, sans-serif';
    ctx.fillText(`r = ${rR.toFixed(2)}R`, hx + (rR > X_MAX_R * 0.6 ? -4 : 4), PAD_T + 4);
  }

  // Canvas title + axis label
  ctx.fillStyle    = c.muted;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.font         = '11px DM Sans, system-ui, sans-serif';
  ctx.fillText('Esfera uniforme — sección transversal', PAD_L + 6, PAD_T + 4);

  ctx.fillStyle    = c.text;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font         = '12px DM Sans, system-ui, sans-serif';
  ctx.fillText('r', PAD_L + plotW / 2, H - 2);

  // Left axis placeholder so PAD_L is not empty
  ctx.save();
  ctx.translate(13, PAD_T + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle    = c.muted;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';
  ctx.font         = '11px DM Sans, system-ui, sans-serif';
  ctx.fillText('↑ y', 0, 0);
  ctx.restore();
}

// ─── MIDDLE CANVAS: gravitational field g(r) ─────────────────────────────────

function renderGField(canvas, M, R, pts, hoverR) {
  const { ctx, W, H } = setupCanvas(canvas);
  const c = palette();

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const baseY = PAD_T + plotH;

  const xMax  = X_MAX_R * R;
  const gSurf = G * M / (R * R);
  const gTop  = gSurf * 1.12;

  const toX = r => PAD_L + (r / xMax) * plotW;
  const toY = g => PAD_T + plotH * (1 - g / gTop);

  // Grid lines
  ctx.strokeStyle = c.grid;
  ctx.lineWidth   = 1;
  for (let i = 0; i <= X_MAX_R; i++) {
    const x = PAD_L + (i / X_MAX_R) * plotW;
    ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, baseY); ctx.stroke();
  }
  const gStep = niceStep(gSurf, 5);
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = c.muted;
  ctx.font         = '11px DM Sans, system-ui, sans-serif';
  for (let v = 0; v <= gTop + gStep * 0.5; v += gStep) {
    const Y = toY(v);
    if (Y < PAD_T - 2 || Y > baseY + 2) continue;
    ctx.beginPath(); ctx.moveTo(PAD_L, Y); ctx.lineTo(PAD_L + plotW, Y); ctx.stroke();
    ctx.fillStyle = c.muted;
    ctx.fillText(fmtVal(v), PAD_L - 6, Y);
  }

  // Axes
  ctx.strokeStyle = c.axis;
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD_L, PAD_T); ctx.lineTo(PAD_L, baseY);
  ctx.lineTo(PAD_L + plotW, baseY);
  ctx.stroke();

  // Dashed vertical at r = R
  const xR = toX(R);
  ctx.strokeStyle = c.sphereStroke;
  ctx.lineWidth   = 1;
  ctx.setLineDash([5, 4]);
  ctx.beginPath(); ctx.moveTo(xR, PAD_T); ctx.lineTo(xR, baseY); ctx.stroke();
  ctx.setLineDash([]);

  // g(r) curve
  ctx.strokeStyle = c.gColor;
  ctx.lineWidth   = 2.2;
  ctx.beginPath();
  pts.forEach((p, i) => {
    i === 0 ? ctx.moveTo(toX(p.r), toY(p.g)) : ctx.lineTo(toX(p.r), toY(p.g));
  });
  ctx.stroke();

  // Annotation: g(R)
  const gSurfY = toY(gSurf);
  ctx.fillStyle    = c.gColor;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'bottom';
  ctx.font         = '10px DM Sans, system-ui, sans-serif';
  ctx.fillText(`g(R) = ${fmtVal(gSurf)} m/s²`, xR + 4, gSurfY - 2);

  // Hover cursor
  if (hoverR != null) {
    const hx  = toX(Math.min(hoverR, xMax));
    const gH  = gravField(hoverR, M, R);
    const hy  = toY(gH);
    ctx.strokeStyle = c.cursor;
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(hx, PAD_T); ctx.lineTo(hx, baseY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle   = c.cursor;
    ctx.strokeStyle = c.bg;
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const right = hoverR > xMax * 0.6;
    ctx.fillStyle    = c.text;
    ctx.textAlign    = right ? 'right' : 'left';
    ctx.textBaseline = 'bottom';
    ctx.font         = '10px DM Sans, system-ui, sans-serif';
    ctx.fillText(`g = ${fmtVal(gH)} m/s²`, hx + (right ? -5 : 5), hy - 4);
  }

  // x-axis tick labels
  ctx.fillStyle    = c.muted;
  ctx.font         = '11px DM Sans, system-ui, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= X_MAX_R; i++) {
    const x   = PAD_L + (i / X_MAX_R) * plotW;
    const lbl = i === 0 ? '0' : i === 1 ? 'R' : `${i}R`;
    ctx.fillText(lbl, x, baseY + 5);
  }

  // Axis labels
  ctx.fillStyle    = c.text;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font         = '12px DM Sans, system-ui, sans-serif';
  ctx.fillText('r', PAD_L + plotW / 2, H - 2);
  ctx.save();
  ctx.translate(13, PAD_T + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('g  (m/s²)', 0, 0);
  ctx.restore();

  // Chart label
  ctx.fillStyle    = c.muted;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.font         = '11px DM Sans, system-ui, sans-serif';
  ctx.fillText('Campo gravitatorio  g(r)', PAD_L + 6, PAD_T + 4);
}

// ─── BOTTOM CANVAS: gravitational potential V(r) ─────────────────────────────

// Pick a round SI unit so tick labels stay compact
function vUnitScale(Vcent) {
  const a = Math.abs(Vcent);
  if (a >= 1e9) return { s: 1e9, lbl: 'GJ/kg' };
  if (a >= 1e6) return { s: 1e6, lbl: 'MJ/kg' };
  if (a >= 1e3) return { s: 1e3, lbl: 'kJ/kg' };
  return { s: 1, lbl: 'J/kg' };
}

function renderVPotential(canvas, M, R, pts, hoverR) {
  const { ctx, W, H } = setupCanvas(canvas);
  const c = palette();

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, W, H);

  const plotW  = W - PAD_L - PAD_R;
  const plotH  = H - PAD_T - PAD_B;
  const baseY  = PAD_T + plotH;

  const xMax   = X_MAX_R * R;
  const Vcent  = gravPotential(0, M, R);
  const yBound = Vcent * 1.10;   // slightly more negative → padding at bottom
  const unit   = vUnitScale(Vcent);
  const sc     = unit.s;

  // V = 0 maps to PAD_T (top); V = yBound maps to baseY (bottom)
  const toX  = r => PAD_L + (r / xMax) * plotW;
  const toY  = V => PAD_T + (V / yBound) * plotH;
  const fmtV = V => (V / sc).toPrecision(3).replace(/\.?0+$/, '');

  // Vertical grid lines
  ctx.strokeStyle = c.grid;
  ctx.lineWidth   = 1;
  for (let i = 0; i <= X_MAX_R; i++) {
    const x = PAD_L + (i / X_MAX_R) * plotW;
    ctx.beginPath(); ctx.moveTo(x, PAD_T); ctx.lineTo(x, baseY); ctx.stroke();
  }

  // Horizontal grid lines + y-axis labels (skip V=0 — it's at the very top edge)
  const vStep = niceStep(Math.abs(Vcent / sc), 5) * sc;
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillStyle    = c.muted;
  ctx.font         = '11px DM Sans, system-ui, sans-serif';
  for (let V = -vStep; V >= yBound - vStep * 0.5; V -= vStep) {
    const Y = toY(V);
    if (Y < PAD_T - 2 || Y > baseY + 2) continue;
    ctx.strokeStyle = c.grid;
    ctx.beginPath(); ctx.moveTo(PAD_L, Y); ctx.lineTo(PAD_L + plotW, Y); ctx.stroke();
    ctx.fillStyle = c.muted;
    ctx.fillText(fmtV(V), PAD_L - 6, Y);
  }
  // Explicit "0" label at top
  ctx.fillStyle    = c.muted;
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText('0', PAD_L - 6, PAD_T + 7);

  // Axes
  ctx.strokeStyle = c.axis;
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(PAD_L, PAD_T); ctx.lineTo(PAD_L, baseY);
  ctx.lineTo(PAD_L + plotW, baseY);
  ctx.stroke();

  // Dashed zero line at top
  ctx.strokeStyle = c.muted;
  ctx.lineWidth   = 1;
  ctx.setLineDash([4, 5]);
  ctx.beginPath(); ctx.moveTo(PAD_L, PAD_T); ctx.lineTo(PAD_L + plotW, PAD_T); ctx.stroke();
  ctx.setLineDash([]);

  // Dashed vertical at r = R
  const xR = toX(R);
  ctx.strokeStyle = c.sphereStroke;
  ctx.lineWidth   = 1;
  ctx.setLineDash([5, 4]);
  ctx.beginPath(); ctx.moveTo(xR, PAD_T); ctx.lineTo(xR, baseY); ctx.stroke();
  ctx.setLineDash([]);

  // V(r) curve
  ctx.strokeStyle = c.vColor;
  ctx.lineWidth   = 2.2;
  ctx.beginPath();
  pts.forEach((p, i) => {
    const y = toY(p.V);
    i === 0 ? ctx.moveTo(toX(p.r), y) : ctx.lineTo(toX(p.r), y);
  });
  ctx.stroke();

  // Annotation: V(R)
  const vSurf  = gravPotential(R, M, R);
  const vSurfY = toY(vSurf);
  ctx.fillStyle    = c.vColor;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.font         = '10px DM Sans, system-ui, sans-serif';
  ctx.fillText(`V(R) = ${fmtV(vSurf)} ${unit.lbl}`, xR + 4, vSurfY + 2);

  // Hover cursor
  if (hoverR != null) {
    const hx = toX(Math.min(hoverR, xMax));
    const Vh = gravPotential(hoverR, M, R);
    const hy = toY(Vh);
    ctx.strokeStyle = c.cursor;
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(hx, PAD_T); ctx.lineTo(hx, baseY); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle   = c.cursor;
    ctx.strokeStyle = c.bg;
    ctx.lineWidth   = 1.5;
    ctx.beginPath(); ctx.arc(hx, hy, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const right = hoverR > xMax * 0.6;
    ctx.fillStyle    = c.text;
    ctx.textAlign    = right ? 'right' : 'left';
    ctx.textBaseline = 'top';
    ctx.font         = '10px DM Sans, system-ui, sans-serif';
    ctx.fillText(`V = ${fmtV(Vh)} ${unit.lbl}`, hx + (right ? -5 : 5), hy + 4);
  }

  // x-axis tick labels
  ctx.fillStyle    = c.muted;
  ctx.font         = '11px DM Sans, system-ui, sans-serif';
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  for (let i = 0; i <= X_MAX_R; i++) {
    const x   = PAD_L + (i / X_MAX_R) * plotW;
    const lbl = i === 0 ? '0' : i === 1 ? 'R' : `${i}R`;
    ctx.fillText(lbl, x, baseY + 5);
  }

  // Axis labels
  ctx.fillStyle    = c.text;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font         = '12px DM Sans, system-ui, sans-serif';
  ctx.fillText('r', PAD_L + plotW / 2, H - 2);
  ctx.save();
  ctx.translate(13, PAD_T + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`V  (${unit.lbl})`, 0, 0);
  ctx.restore();

  // Chart label
  ctx.fillStyle    = c.muted;
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  ctx.font         = '11px DM Sans, system-ui, sans-serif';
  ctx.fillText('Potencial gravitatorio  V(r)', PAD_L + 6, PAD_T + 4);
}
