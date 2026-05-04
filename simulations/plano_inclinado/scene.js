// scene.js — Canvas renderer for the inclined plane simulation

function isDarkMode() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// Draw arrow from (x1,y1)→(x2,y2). Optional label beyond tip, optional dash pattern.
function drawArrow(ctx, x1, y1, x2, y2, color, label, dash) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 2) return;

  const ux = dx / len, uy = dy / len;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
  ctx.lineWidth   = 2;
  ctx.lineCap     = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.setLineDash([]);

  const hl = Math.min(11, len * 0.35), hw = hl * 0.5;
  const px = -uy, py = ux;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ux * hl + px * hw, y2 - uy * hl + py * hw);
  ctx.lineTo(x2 - ux * hl - px * hw, y2 - uy * hl - py * hw);
  ctx.closePath();
  ctx.fill();

  if (label) {
    ctx.font         = 'bold 12px DM Sans, system-ui, sans-serif';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x2 + ux * 15, y2 + uy * 15);
  }
  ctx.restore();
}

function render(canvas, state) {
  const ctx  = canvas.getContext('2d');
  const dpr  = window.devicePixelRatio || 1;
  const CW   = canvas.clientWidth;
  const CH   = canvas.clientHeight;
  if (canvas.width !== CW * dpr || canvas.height !== CH * dpr) {
    canvas.width  = CW * dpr;
    canvas.height = CH * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, CW, CH);

  const dark = isDarkMode();
  const clrBg    = dark ? '#222831' : '#ffffff';
  const clrRamp  = dark ? '#4c566a' : '#dde3ed';
  const clrEdge  = dark ? '#7a8595' : '#8899aa';
  const clrGround= dark ? '#4c566a' : '#cbd5e1';
  const clrBlock = dark ? '#5fb3d4' : '#2d7d9a';
  const clrBlockStroke = dark ? '#a8d5e8' : '#1a5c75';
  const clrText  = dark ? '#d0d8e4' : '#1f2937';
  const clrMuted = dark ? '#8f9ba8' : '#6b7280';

  ctx.fillStyle = clrBg;
  ctx.fillRect(0, 0, CW, CH);

  const padL = 44, padR = 36, padT = 44, padB = 44;
  const plotW = CW - padL - padR;
  const plotH = CH - padT - padB;
  const baseY = padT + plotH * 0.86;

  const { theta, phys, s_pos, showDecomp } = state;
  const cosT = Math.cos(theta), sinT = Math.sin(theta);

  // Slope length in canvas pixels (slope = SLOPE_M metres)
  const SLOPE_M = 4.0;
  const availW  = plotW * 0.80, availH = plotH * 0.78;
  const slopeLen = theta > 0.01
    ? Math.min(availW / cosT, availH / sinT) * 0.85
    : availW * 0.85;
  const scale = slopeLen / SLOPE_M;  // px / m

  // Ramp vertices
  // bx,by = bottom-left (where angle θ is)
  // tx,ty = top of slope
  // rx,ry = bottom-right (right angle)
  const bx = padL + plotW * 0.06, by = baseY;
  const tx = bx + slopeLen * cosT, ty = by - slopeLen * sinT;
  const rx = tx, ry = by;

  // --- Ground line + hatching ---
  ctx.strokeStyle = clrGround;
  ctx.lineWidth   = 2;
  ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(CW, by); ctx.stroke();
  ctx.lineWidth = 1;
  for (let xi = 0; xi < CW; xi += 12) {
    ctx.beginPath(); ctx.moveTo(xi, by); ctx.lineTo(xi - 6, by + 8); ctx.stroke();
  }

  // --- Ramp body ---
  ctx.fillStyle   = clrRamp;
  ctx.strokeStyle = clrEdge;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.lineTo(rx, ry);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // --- Angle arc + label ---
  if (theta > 0.04) {
    const ar  = Math.min(38, slopeLen * 0.14);
    const ma  = -theta / 2;
    ctx.strokeStyle = clrMuted; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(bx, by, ar, -theta, 0); ctx.stroke();
    ctx.fillStyle   = clrMuted;
    ctx.font        = '13px DM Sans, system-ui, sans-serif';
    ctx.textAlign   = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('θ', bx + (ar + 13) * Math.cos(ma), by + (ar + 13) * Math.sin(ma));
  }

  // --- Block ---
  // Block side in metres; centre = contact point + half-block along outward normal
  const BLK_M  = 0.28;
  const blkPx  = BLK_M * scale;
  const sp     = Math.max(BLK_M / 2 + 0.01, Math.min(s_pos, SLOPE_M - BLK_M / 2));
  // Contact point (bottom-centre of block on slope surface)
  const cpx    = bx + sp * scale * cosT;
  const cpy    = by - sp * scale * sinT;
  // Block centre (offset by blkPx/2 in outward-normal direction: (-sinT, -cosT))
  const blkCx  = cpx + (blkPx / 2) * (-sinT);
  const blkCy  = cpy + (blkPx / 2) * (-cosT);

  ctx.save();
  ctx.translate(blkCx, blkCy);
  ctx.rotate(-theta);
  ctx.fillStyle   = clrBlock;
  ctx.strokeStyle = clrBlockStroke;
  ctx.lineWidth   = 1.5;
  ctx.fillRect(-blkPx / 2, -blkPx / 2, blkPx, blkPx);
  ctx.strokeRect(-blkPx / 2, -blkPx / 2, blkPx, blkPx);
  ctx.restore();

  // --- Axes when decomposing ---
  if (showDecomp && theta > 0.01) {
    const axLen = Math.min(slopeLen * 0.45, blkPx * 3.5);
    ctx.save();
    ctx.lineWidth = 1;

    // Parallel axis (slope direction, orange)
    ctx.strokeStyle = '#d4a23c';
    ctx.setLineDash([5, 3]);
    ctx.beginPath();
    ctx.moveTo(blkCx - axLen * cosT, blkCy + axLen * sinT);
    ctx.lineTo(blkCx + axLen * cosT, blkCy - axLen * sinT);
    ctx.stroke();

    // Perpendicular axis (normal direction, light blue)
    ctx.strokeStyle = '#5fb3d4';
    ctx.beginPath();
    ctx.moveTo(blkCx + axLen * sinT, blkCy + axLen * cosT);
    ctx.lineTo(blkCx - axLen * sinT, blkCy - axLen * cosT);
    ctx.stroke();

    ctx.setLineDash([]);
    ctx.font = '11px DM Sans, system-ui, sans-serif';
    ctx.textBaseline = 'middle'; ctx.textAlign = 'center';

    ctx.fillStyle = '#d4a23c';
    ctx.fillText('∥', blkCx + (axLen + 10) * cosT, blkCy - (axLen + 10) * sinT);

    ctx.fillStyle = '#5fb3d4';
    ctx.fillText('⊥', blkCx - (axLen + 10) * sinT, blkCy - (axLen + 10) * cosT);

    ctx.restore();
  }

  // --- Force arrows ---
  // Scale: refLen pixels = full weight W
  const refLen = Math.min(CH * 0.26, slopeLen * 0.38);
  const fSc    = phys.W > 0 ? refLen / phys.W : 0;

  // Weight W (straight down in canvas: direction (0,+1))
  drawArrow(ctx, blkCx, blkCy, blkCx, blkCy + phys.W * fSc, '#e07a5f', 'W');

  // Normal N (outward normal direction: (-sinT, -cosT))
  drawArrow(ctx, blkCx, blkCy,
    blkCx + phys.N * fSc * (-sinT),
    blkCy + phys.N * fSc * (-cosT),
    '#3aa776', 'N');

  // Friction f (up-slope direction: (cosT, -sinT) in canvas)
  if (phys.f > 1e-6) {
    drawArrow(ctx, blkCx, blkCy,
      blkCx + phys.f * fSc * cosT,
      blkCy + phys.f * fSc * (-sinT),
      '#b06ab3', 'f');
  }

  // Decomposition of W (dashed)
  if (showDecomp) {
    // W∥ down the slope: direction (-cosT, sinT)
    drawArrow(ctx, blkCx, blkCy,
      blkCx + phys.W_par * fSc * (-cosT),
      blkCy + phys.W_par * fSc * sinT,
      '#d4a23c', 'W∥', [5, 3]);

    // W⊥ into the slope: direction (sinT, cosT)
    drawArrow(ctx, blkCx, blkCy,
      blkCx + phys.W_perp * fSc * sinT,
      blkCy + phys.W_perp * fSc * cosT,
      '#5fb3d4', 'W⊥', [5, 3]);
  }

  // --- Status overlay (top-left) ---
  ctx.fillStyle    = clrText;
  ctx.font         = '13px DM Sans, system-ui, sans-serif';
  ctx.textAlign    = 'left';
  ctx.textBaseline = 'top';
  const status = phys.sliding
    ? `a = ${phys.a.toFixed(2)} m/s²  ·  deslizando`
    : 'a = 0.00 m/s²  ·  en reposo';
  ctx.fillText(status, padL, 12);
}
