// simulations/coriolis-carousel/renderer.js

/** Convert metres in disc coords (y up) -> canvas pixel coords (y down). */
function metersToCanvas(x, y, cx, cy, scale) {
  return { px: cx + x * scale, py: cy - y * scale };
}

/** Draw the platform disc: glow, fill, concentric rings + spokes (decorative, Earth-glow styling). */
function drawDisc(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#163a4a';
  ctx.shadowColor = '#2d7d9a';
  ctx.shadowBlur = 20;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = 0.8;
  for (let frac = 0.25; frac <= 1; frac += 0.25) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * frac, 0, Math.PI * 2);
    ctx.stroke();
  }
  for (let a = 0; a < 360; a += 30) {
    const rad = a * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * Math.sin(rad), cy - r * Math.cos(rad));
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#2d7d9a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

/** Draw a labelled person marker (Ana / Ben) at a canvas position. */
function drawPerson(ctx, px, py, color, label) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, 6, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.font = 'bold 12px sans-serif';
  ctx.fillStyle = color;
  ctx.textAlign = 'center';
  ctx.fillText(label, px, py - 12);
  ctx.restore();
}

const VEL_SCALE = 10; // px per m/s, for the launch-velocity vector diagram

/** Arrow from (x,y) in direction (dx,dy), canvas-pixel units, with an optional label and dash style. */
function drawArrow(ctx, x, y, dx, dy, color, { dashed = false, label = null, labelDy = 4 } = {}) {
  const m = Math.sqrt(dx * dx + dy * dy);
  if (m < 1.5) return;
  const nx = dx / m, ny = dy / m;
  const ex = x + dx, ey = y + dy;
  const headLen = 7;
  const angle = Math.atan2(ny, nx);
  ctx.save();
  if (dashed) ctx.setLineDash([4, 4]);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - headLen * Math.cos(angle - 0.4), ey - headLen * Math.sin(angle - 0.4));
  ctx.lineTo(ex - headLen * Math.cos(angle + 0.4), ey - headLen * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();
  if (label) {
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, ex + 4, ey + labelDy);
  }
  ctx.restore();
}

/**
 * Draw the launch-velocity vector diagram at Ana's position: her own
 * platform-carried velocity, the throw velocity relative to her, and the
 * resulting ball velocity — tip-to-tail when the throw is "relative to Ana"
 * (so the diagram visibly sums to the resultant), or Ana's velocity shown
 * shown dashed when the mode is "absolute" (true, but not used). All three
 * are drawn from the same point (Ana's position), not tip-to-tail, so each
 * can be read directly as its own vector.
 *
 * @param originPx {x,y} canvas pixel position of Ana
 * @param anaVel, throwVel, resultant  {x,y} in m/s, physics coords (y up)
 * @param includeAna  whether anaVel actually contributes to resultant
 */
function drawVelocityVectors(ctx, originPx, anaVel, throwVel, resultant, includeAna) {
  const toPx = v => ({ dx: v.x * VEL_SCALE, dy: -v.y * VEL_SCALE });
  const aPx = toPx(anaVel);
  const tPx = toPx(throwVel);
  const rPx = toPx(resultant);

  drawArrow(ctx, originPx.px, originPx.py, aPx.dx, aPx.dy, '#4fd1ff',
    { dashed: !includeAna, label: includeAna ? 'Ana' : 'Ana (unused)', labelDy: -8 });
  drawArrow(ctx, originPx.px, originPx.py, tPx.dx, tPx.dy, '#ff6fd8', { label: 'throw', labelDy: 4 });
  drawArrow(ctx, originPx.px, originPx.py, rPx.dx, rPx.dy, '#ffffff', { label: 'ball', labelDy: 16 });
}

/** Dashed guide line from Ana to her aim point (shown only before/at launch). */
function drawAimLine(ctx, x0, y0, x1, y1) {
  ctx.save();
  ctx.setLineDash([4, 5]);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

function drawTrail(ctx, trail, color, { dash = null } = {}) {
  if (trail.length < 2) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = dash ? 2 : 1.8;
  ctx.lineJoin = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(trail[0].px, trail[0].py);
  for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].px, trail[i].py);
  ctx.stroke();
  ctx.restore();
}

function drawBall(ctx, px, py) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.restore();
}

function drawResultBanner(ctx, canvasW, canvasH, text, good) {
  ctx.save();
  ctx.fillStyle = good ? 'rgba(40,120,70,0.85)' : 'rgba(120,60,40,0.85)';
  ctx.fillRect(0, canvasH / 2 - 20, canvasW, 40);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(text, canvasW / 2, canvasH / 2 + 5);
  ctx.restore();
}

if (typeof module !== 'undefined') {
  module.exports = {
    metersToCanvas, drawDisc, drawPerson, drawAimLine,
    drawArrow, drawVelocityVectors,
    drawTrail, drawBall, drawResultBanner,
  };
}
