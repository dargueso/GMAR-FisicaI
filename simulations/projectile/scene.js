// simulations/projectile/scene.js
// Renders trajectories on a 2D canvas. Auto-scales to fit all trajectories.

const PALETTE = [
  '#2d7d9a', '#e07a5f', '#3aa776', '#b06ab3',
  '#d4a23c', '#5fb3d4', '#ee5253', '#10ac84',
];

function colorFor(index) {
  return PALETTE[index % PALETTE.length];
}

function isDarkMode() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

// View parameters from the most recent render — used by main.js to hit-test
// mouse coords against apex points (which depend on the auto-scaled bounds).
let g_lastView = null;
function getLastView() { return g_lastView; }

// Compute world-space bounding box across all trajectories. Pads by 5%.
function computeBounds(trajectories, preview) {
  const all = trajectories.slice();
  if (preview && preview.points.length > 0) all.push(preview);
  let xMax = 10, yMax = 5;
  for (const tr of all) {
    for (const p of tr.points) {
      if (p.x > xMax) xMax = p.x;
      if (p.y > yMax) yMax = p.y;
    }
  }
  return { xMin: 0, yMin: 0, xMax: xMax * 1.08, yMax: yMax * 1.15 };
}

// Compute "nice" tick spacing so we get ~5–8 ticks across the range.
function niceStep(range) {
  const target = range / 6;
  const exp    = Math.floor(Math.log10(target));
  const base   = target / Math.pow(10, exp);
  let nice;
  if      (base < 1.5) nice = 1;
  else if (base < 3)   nice = 2;
  else if (base < 7)   nice = 5;
  else                 nice = 10;
  return nice * Math.pow(10, exp);
}

function render(canvas, trajectories, preview, opts = {}) {
  const showV       = !!opts.showV;
  const showVx      = !!opts.showVx;
  const showVy      = !!opts.showVy;
  const hoveredApex = (opts.hoveredApex != null) ? opts.hoveredApex : null;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
    canvas.width  = cssW * dpr;
    canvas.height = cssH * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const dark = isDarkMode();
  const colorBg     = dark ? '#222831' : '#ffffff';
  const colorAxis   = dark ? '#7a8595' : '#5a6776';
  const colorGrid   = dark ? '#3b4252' : '#e2e8f0';
  const colorText   = dark ? '#d0d8e4' : '#1f2937';
  const colorMuted  = dark ? '#8f9ba8' : '#6b7280';

  ctx.fillStyle = colorBg;
  ctx.fillRect(0, 0, cssW, cssH);

  const padL = 56, padR = 18, padT = 18, padB = 36;
  const plotW = cssW - padL - padR;
  const plotH = cssH - padT - padB;

  const { xMin, yMin, xMax, yMax } = computeBounds(trajectories, preview);
  const sx = plotW / (xMax - xMin);
  const sy = plotH / (yMax - yMin);
  const toX = x => padL + (x - xMin) * sx;
  const toY = y => padT + plotH - (y - yMin) * sy;

  // Grid + tick labels.
  ctx.strokeStyle = colorGrid;
  ctx.lineWidth   = 1;
  ctx.fillStyle   = colorMuted;
  ctx.font        = '11px DM Sans, system-ui, sans-serif';

  const xStep = niceStep(xMax - xMin);
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'top';
  for (let v = 0; v <= xMax; v += xStep) {
    const X = toX(v);
    ctx.beginPath();
    ctx.moveTo(X, padT);
    ctx.lineTo(X, padT + plotH);
    ctx.stroke();
    ctx.fillText(v.toFixed(xStep < 1 ? 1 : 0), X, padT + plotH + 6);
  }

  const yStep = niceStep(yMax - yMin);
  ctx.textAlign    = 'right';
  ctx.textBaseline = 'middle';
  for (let v = 0; v <= yMax; v += yStep) {
    const Y = toY(v);
    ctx.beginPath();
    ctx.moveTo(padL, Y);
    ctx.lineTo(padL + plotW, Y);
    ctx.stroke();
    ctx.fillText(v.toFixed(yStep < 1 ? 1 : 0), padL - 6, Y);
  }

  // Axes.
  ctx.strokeStyle = colorAxis;
  ctx.lineWidth   = 1.5;
  ctx.beginPath();
  ctx.moveTo(padL, padT);
  ctx.lineTo(padL, padT + plotH);
  ctx.lineTo(padL + plotW, padT + plotH);
  ctx.stroke();

  // Axis labels.
  ctx.fillStyle    = colorText;
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'bottom';
  ctx.font         = '12px DM Sans, system-ui, sans-serif';
  ctx.fillText('x  (m)', padL + plotW / 2, cssH - 4);
  ctx.save();
  ctx.translate(14, padT + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('y  (m)', 0, 0);
  ctx.restore();

  // Preview (dashed) — current input parameters before launching.
  if (preview && preview.points.length >= 2) {
    ctx.strokeStyle = colorMuted;
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([4, 4]);
    drawPath(ctx, preview.points, toX, toY);
    ctx.setLineDash([]);
  }

  // Saved trajectories. Each one's path is drawn only up to its animElapsed
  // time, then a dot is overlaid at the exact analytical position. Animation
  // ticks at 1× real time, so the dot's screen velocity = real velocity × scale.
  trajectories.forEach((tr, idx) => {
    const tNow = Math.max(0, Math.min(tr.tFlight, tr.animElapsed ?? tr.tFlight));

    ctx.strokeStyle = tr.color;
    ctx.lineWidth   = 2.2;
    drawPathUpTo(ctx, tr.points, tNow, toX, toY);

    // Apex marker — appears once the dot has reached it.
    const apexVisible = tr.tApex > 0 && tNow >= tr.tApex;
    if (apexVisible) {
      const ax = tr.vx * tr.tApex;
      ctx.fillStyle = tr.color;
      ctx.beginPath();
      ctx.arc(toX(ax), toY(tr.hMax),
              hoveredApex === idx ? 6 : 3.5,
              0, Math.PI * 2);
      ctx.fill();
    }
    // Landing marker — appears once the dot has landed.
    if (tr.tFlight > 0 && tNow >= tr.tFlight) {
      ctx.fillStyle   = tr.color;
      ctx.strokeStyle = colorBg;
      ctx.lineWidth   = 1.5;
      ctx.beginPath();
      ctx.arc(toX(tr.range), toY(0), 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Animated projectile dot at the exact analytical position for tNow.
    const dx = tr.vx * tNow;
    const dy = tr.params.h0 + tr.vy0 * tNow - 0.5 * tr.params.g * tNow * tNow;
    ctx.fillStyle   = tr.color;
    ctx.strokeStyle = colorBg;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(toX(dx), toY(dy), 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Velocity vectors at the dot. Length = velocity × 1 sec, in world meters,
    // so arrow tip points to where the projectile would be in 1 s of constant
    // current velocity (visual = "instantaneous velocity made tangible").
    const vxNow = tr.vx;
    const vyNow = tr.vy0 - tr.params.g * tNow;
    if (showVx) drawArrow(ctx, toX(dx), toY(dy), toX(dx + vxNow), toY(dy),
                          tr.color, [6, 4]);
    if (showVy) drawArrow(ctx, toX(dx), toY(dy), toX(dx), toY(dy + vyNow),
                          tr.color, [2, 3]);
    if (showV)  drawArrow(ctx, toX(dx), toY(dy), toX(dx + vxNow), toY(dy + vyNow),
                          tr.color, null);

    // Apex hover overlay: draw the (vx-only) velocity vector at the apex.
    if (hoveredApex === idx && apexVisible) {
      const ax = tr.vx * tr.tApex;
      const ay = tr.hMax;
      drawArrow(ctx, toX(ax), toY(ay), toX(ax + tr.vx), toY(ay),
                tr.color, null);
    }
  });

  g_lastView = { padL, padT, plotW, plotH, xMin, yMin, sx, sy };
}

// Draw a line + arrowhead from (x1,y1) → (x2,y2) in screen pixels.
// `dash`: null for solid, or e.g. [6,4] for dashed.
function drawArrow(ctx, x1, y1, x2, y2, color, dash) {
  const vx = x2 - x1, vy = y2 - y1;
  const len = Math.sqrt(vx*vx + vy*vy);
  if (len < 1) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle   = color;
  ctx.lineWidth   = 1.8;
  ctx.lineCap     = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.setLineDash([]);

  const headLen = Math.min(10, len * 0.4);
  const headW   = headLen * 0.55;
  const ux = vx / len, uy = vy / len;
  const px = -uy,      py = ux;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - ux*headLen + px*headW, y2 - uy*headLen + py*headW);
  ctx.lineTo(x2 - ux*headLen - px*headW, y2 - uy*headLen - py*headW);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPath(ctx, points, toX, toY) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(toX(points[0].x), toY(points[0].y));
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(toX(points[i].x), toY(points[i].y));
  }
  ctx.stroke();
}

// Draw the path from t=0 up to t=tCut. The path ends at the exact analytical
// position, not just the last sample, so the line meets the animated dot.
function drawPathUpTo(ctx, points, tCut, toX, toY) {
  if (points.length < 2 || tCut <= 0) return;
  ctx.beginPath();
  ctx.moveTo(toX(points[0].x), toY(points[0].y));
  let i = 1;
  for (; i < points.length && points[i].t <= tCut; i++) {
    ctx.lineTo(toX(points[i].x), toY(points[i].y));
  }
  // Linear interp to the exact tCut position between sample i-1 and i.
  if (i < points.length) {
    const a = points[i - 1], b = points[i];
    const u = (tCut - a.t) / (b.t - a.t);
    ctx.lineTo(toX(a.x + u*(b.x - a.x)), toY(a.y + u*(b.y - a.y)));
  }
  ctx.stroke();
}
