// energia/scene.js

const PAIRS = [
  ['#2d7d9a', '#e07a5f'],
  ['#3aa776', '#b06ab3'],
  ['#d4a23c', '#5fb3d4'],
  ['#10ac84', '#ee5253'],
];

function colorsFor(index) { return PAIRS[index % PAIRS.length]; }
function colorFor(index)  { return PAIRS[index % PAIRS.length][0]; }

function isDarkMode() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function niceStep(range) {
  if (range <= 0) return 1;
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

function setupCanvas(canvas) {
  const ctx  = canvas.getContext('2d');
  const dpr  = window.devicePixelRatio || 1;
  const cssW = canvas.clientWidth;
  const cssH = canvas.clientHeight;
  if (canvas.width !== cssW * dpr || canvas.height !== cssH * dpr) {
    canvas.width  = cssW * dpr;
    canvas.height = cssH * dpr;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);
  return { ctx, cssW, cssH };
}

function darkColors() {
  const dark = isDarkMode();
  return {
    bg:    dark ? '#222831' : '#ffffff',
    axis:  dark ? '#7a8595' : '#5a6776',
    grid:  dark ? '#3b4252' : '#e2e8f0',
    text:  dark ? '#d0d8e4' : '#1f2937',
    muted: dark ? '#8f9ba8' : '#6b7280',
    ramp:  dark ? '#4c566a' : '#dde3ed',
    edge:  dark ? '#7a8595' : '#8899aa',
    gnd:   dark ? '#4c566a' : '#cbd5e1',
  };
}

// ─── TOP CANVAS: projectile trajectory (x vs y) ──────────────────────────────

function computeTrajBounds(trajectories, preview) {
  let xMax = 10, yMax = 5;
  const all = trajectories.slice();
  if (preview && preview.points.length > 0) all.push(preview);
  for (const tr of all) {
    for (const p of tr.points) {
      if (p.x > xMax) xMax = p.x;
      if (p.y > yMax) yMax = p.y;
    }
  }
  return { xMax: xMax * 1.08, yMax: yMax * 1.15 };
}

function renderTrajectory(canvas, trajectories, preview) {
  const { ctx, cssW, cssH } = setupCanvas(canvas);
  const c = darkColors();

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, cssW, cssH);

  const padL = 56, padR = 18, padT = 18, padB = 36;
  const plotW = cssW - padL - padR;
  const plotH = cssH - padT - padB;

  const { xMax, yMax } = computeTrajBounds(trajectories, preview);
  const toX = x => padL + (x / xMax) * plotW;
  const toY = y => padT + plotH - (y / yMax) * plotH;

  ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
  ctx.fillStyle   = c.muted;
  ctx.font        = '11px DM Sans, system-ui, sans-serif';

  const xStep = niceStep(xMax);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let v = 0; v <= xMax; v += xStep) {
    const X = toX(v);
    ctx.beginPath(); ctx.moveTo(X, padT); ctx.lineTo(X, padT + plotH); ctx.stroke();
    ctx.fillText(v.toFixed(xStep < 1 ? 1 : 0), X, padT + plotH + 6);
  }

  const yStep = niceStep(yMax);
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let v = 0; v <= yMax; v += yStep) {
    const Y = toY(v);
    ctx.beginPath(); ctx.moveTo(padL, Y); ctx.lineTo(padL + plotW, Y); ctx.stroke();
    ctx.fillText(v.toFixed(yStep < 1 ? 1 : 0), padL - 6, Y);
  }

  ctx.strokeStyle = c.axis; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH);
  ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke();

  ctx.fillStyle = c.text; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.font = '12px DM Sans, system-ui, sans-serif';
  ctx.fillText('x  (m)', padL + plotW / 2, cssH - 4);
  ctx.save(); ctx.translate(14, padT + plotH / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillText('y  (m)', 0, 0); ctx.restore();

  ctx.fillStyle = c.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = '11px DM Sans, system-ui, sans-serif';
  ctx.fillText('Trayectoria', padL + 6, padT + 5);

  if (preview && preview.points.length >= 2) {
    ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    drawXYPath(ctx, preview.points, toX, toY);
    ctx.setLineDash([]);
  }

  trajectories.forEach((tr) => {
    const tNow = Math.max(0, Math.min(tr.tEnd, tr.animElapsed ?? tr.tEnd));
    ctx.strokeStyle = tr.ecColor; ctx.lineWidth = 2.2;
    drawXYPathUpTo(ctx, tr.points, tNow, toX, toY);

    const dx = tr.vx * tNow;
    const dy = tr.params.h0 + tr.vy0 * tNow - 0.5 * tr.params.g * tNow * tNow;
    ctx.fillStyle = tr.ecColor; ctx.strokeStyle = c.bg; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(toX(dx), toY(dy), 5, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  });
}

function drawXYPath(ctx, points, toX, toY) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(toX(points[0].x), toY(points[0].y));
  for (let i = 1; i < points.length; i++) ctx.lineTo(toX(points[i].x), toY(points[i].y));
  ctx.stroke();
}

function drawXYPathUpTo(ctx, points, tCut, toX, toY) {
  if (points.length < 2 || tCut <= 0) return;
  ctx.beginPath();
  ctx.moveTo(toX(points[0].x), toY(points[0].y));
  let i = 1;
  for (; i < points.length && points[i].t <= tCut; i++)
    ctx.lineTo(toX(points[i].x), toY(points[i].y));
  if (i < points.length) {
    const a = points[i - 1], b = points[i];
    const u = (tCut - a.t) / (b.t - a.t);
    ctx.lineTo(toX(a.x + u * (b.x - a.x)), toY(a.y + u * (b.y - a.y)));
  }
  ctx.stroke();
}

// ─── TOP CANVAS: inclined plane scene (no force arrows) ──────────────────────

function renderInclinedScene(canvas, trajectories, inclParams) {
  const { ctx, cssW, cssH } = setupCanvas(canvas);
  const c = darkColors();

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, cssW, cssH);

  const theta = inclParams.angle * Math.PI / 180;
  const cosT  = Math.cos(theta);
  const sinT  = Math.sin(theta);

  const padL = 44, padR = 36, padT = 44, padB = 44;
  const plotW = cssW - padL - padR;
  const plotH = cssH - padT - padB;
  const baseY = padT + plotH * 0.86;

  const availW   = plotW * 0.80, availH = plotH * 0.78;
  const slopeLen = theta > 0.01
    ? Math.min(availW / cosT, availH / sinT) * 0.85
    : availW * 0.85;
  const scale = slopeLen / SLOPE_M;

  const bx = padL + plotW * 0.06, by = baseY;
  const tx = bx + slopeLen * cosT, ty = by - slopeLen * sinT;
  const rx = tx, ry = by;

  // Ground + hatching
  ctx.strokeStyle = c.gnd; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(cssW, by); ctx.stroke();
  ctx.lineWidth = 1;
  for (let xi = 0; xi < cssW; xi += 12) {
    ctx.beginPath(); ctx.moveTo(xi, by); ctx.lineTo(xi - 6, by + 8); ctx.stroke();
  }

  // Ramp body
  ctx.fillStyle = c.ramp; ctx.strokeStyle = c.edge; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.lineTo(rx, ry);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Angle arc + θ label
  if (theta > 0.04) {
    const ar = Math.min(38, slopeLen * 0.14);
    const ma = -theta / 2;
    ctx.strokeStyle = c.muted; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(bx, by, ar, -theta, 0); ctx.stroke();
    ctx.fillStyle = c.muted;
    ctx.font = '13px DM Sans, system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('θ', bx + (ar + 13) * Math.cos(ma), by + (ar + 13) * Math.sin(ma));
  }

  // Determine block position from the most recent trajectory or the preview
  const latestTr = trajectories.length > 0 ? trajectories[trajectories.length - 1] : null;
  let s_pos, blockFill, blockStroke;

  const dark = isDarkMode();
  const defFill   = dark ? '#5fb3d4' : '#2d7d9a';
  const defStroke = dark ? '#a8d5e8' : '#1a5c75';

  if (latestTr && !latestTr.isStatic) {
    const tNow = Math.min(latestTr.tEnd, latestTr.animElapsed ?? latestTr.tEnd);
    s_pos      = Math.max(S_MIN, latestTr.s0 - 0.5 * latestTr.a * tNow * tNow);
    blockFill  = latestTr.ecColor;
    blockStroke= c.bg;
  } else {
    s_pos      = Math.max(S_MIN, Math.min(inclParams.s0, SLOPE_M - BLK_HALF));
    blockFill  = defFill;
    blockStroke= defStroke;
  }

  // Block
  const blkPx = BLK_HALF * 2 * scale;
  const sp     = Math.max(BLK_HALF + 0.01, Math.min(s_pos, SLOPE_M - BLK_HALF));
  const cpx    = bx + sp * scale * cosT;
  const cpy    = by - sp * scale * sinT;
  const blkCx  = cpx + (blkPx / 2) * (-sinT);
  const blkCy  = cpy + (blkPx / 2) * (-cosT);

  ctx.save();
  ctx.translate(blkCx, blkCy);
  ctx.rotate(-theta);
  ctx.fillStyle   = blockFill;
  ctx.strokeStyle = blockStroke;
  ctx.lineWidth   = 1.5;
  ctx.fillRect(-blkPx / 2, -blkPx / 2, blkPx, blkPx);
  ctx.strokeRect(-blkPx / 2, -blkPx / 2, blkPx, blkPx);
  ctx.restore();

  // Chart title
  ctx.fillStyle = c.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = '11px DM Sans, system-ui, sans-serif';
  ctx.fillText('Plano inclinado', padL, 12);
}

// ─── TOP CANVAS: spring–mass scene ───────────────────────────────────────────

function drawSpring(ctx, x1, x2, cy, amplitude, nCoils, strokeStyle, lineWidth) {
  const length = x2 - x1;
  if (length <= 1) return;
  const leadLen = Math.min(length * 0.10, 10);
  const zigLen  = length - 2 * leadLen;
  const n       = nCoils * 2;
  const segW    = zigLen / n;

  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth   = lineWidth;
  ctx.lineJoin    = 'miter';
  ctx.beginPath();
  ctx.moveTo(x1, cy);
  ctx.lineTo(x1 + leadLen, cy);
  for (let i = 0; i < n; i++) {
    ctx.lineTo(x1 + leadLen + (i + 0.5) * segW, cy + (i % 2 === 0 ? -amplitude : amplitude));
  }
  ctx.lineTo(x2, cy);
  ctx.stroke();
}

function renderSpringScene(canvas, trajectories, springParams) {
  const { ctx, cssW, cssH } = setupCanvas(canvas);
  const c = darkColors();
  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, cssW, cssH);

  const { x0 } = springParams;

  const groundY  = cssH * 0.72;
  const blockH   = Math.min(cssH * 0.26, 76);
  const blockW   = blockH;
  const springCY = groundY - blockH / 2;

  const wallW  = Math.max(14, cssW * 0.042);
  const wallX1 = wallW;  // spring attaches here

  const massEqX   = cssW * 0.50;
  const availLeft  = massEqX - wallX1 - blockW / 2 - 6;
  const availRight = cssW * 0.95 - blockW / 2 - massEqX;
  const scale      = Math.min(availLeft, availRight) / Math.max(x0, 0.01);

  const latestTr = trajectories.length > 0 ? trajectories[trajectories.length - 1] : null;
  let curX, trColor;

  if (latestTr) {
    const tNow = latestTr.loop
      ? (latestTr.tEnd > 0 ? latestTr.animElapsed % latestTr.tEnd : 0)
      : Math.max(0, Math.min(latestTr.tEnd, latestTr.animElapsed ?? latestTr.tEnd));
    curX    = interpEnergy(latestTr.points, 'x', tNow, latestTr.tEnd);
    trColor = latestTr.ecColor;
  } else {
    curX    = x0;
    trColor = null;
  }

  const dark    = isDarkMode();
  const massCX  = massEqX + curX * scale;
  const massL   = massCX - blockW / 2;
  const massTop = groundY - blockH;

  // Ground
  ctx.strokeStyle = c.gnd; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(wallX1, groundY); ctx.lineTo(cssW, groundY); ctx.stroke();
  ctx.lineWidth = 1;
  for (let xi = wallX1; xi < cssW; xi += 14) {
    ctx.beginPath(); ctx.moveTo(xi, groundY); ctx.lineTo(xi + 7, groundY + 9); ctx.stroke();
  }

  // Wall
  ctx.fillStyle = c.ramp; ctx.strokeStyle = c.edge; ctx.lineWidth = 2;
  ctx.fillRect(0, 0, wallW, groundY);
  ctx.strokeRect(0, 0, wallW, groundY);
  ctx.lineWidth = 1;
  for (let yi = 4; yi < groundY; yi += 14) {
    ctx.beginPath(); ctx.moveTo(wallX1, yi); ctx.lineTo(0, yi + 10); ctx.stroke();
  }

  // Equilibrium dashed line
  ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.setLineDash([4, 5]);
  ctx.beginPath(); ctx.moveTo(massEqX, massTop - 14); ctx.lineTo(massEqX, groundY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = c.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.font = '10px DM Sans, system-ui, sans-serif';
  ctx.fillText('x = 0', massEqX, massTop - 16);

  // Spring
  const springLen = Math.max(6, massL - wallX1);
  const coilAmp   = Math.min(blockH * 0.26, springLen * 0.13, 13);
  const strColor  = trColor ?? (dark ? '#7a8595' : '#5a6776');
  drawSpring(ctx, wallX1, massL, springCY, coilAmp, 8, strColor, 2);

  // Block
  ctx.fillStyle   = trColor ?? (dark ? '#5fb3d4' : '#2d7d9a');
  ctx.strokeStyle = c.bg; ctx.lineWidth = 2;
  ctx.fillRect(massL, massTop, blockW, blockH);
  ctx.strokeRect(massL, massTop, blockW, blockH);

  // Label
  ctx.fillStyle = c.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = '11px DM Sans, system-ui, sans-serif';
  ctx.fillText('Muelle — ley de Hooke', wallX1 + 6, 8);
}

// ─── TOP CANVAS: pendulum scene ──────────────────────────────────────────────

function renderPendulumScene(canvas, trajectories, pendParams) {
  const { ctx, cssW, cssH } = setupCanvas(canvas);
  const c = darkColors();

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, cssW, cssH);

  const pivX = cssW / 2;
  const pivY = cssH * 0.10;
  const bobR = Math.max(8, Math.min(18, cssH * 0.030));
  const L_px = cssH * 0.78 - bobR;

  const latestTr = trajectories.length > 0 ? trajectories[trajectories.length - 1] : null;
  let currentTheta, theta0, trColor;

  if (latestTr) {
    const tNow   = latestTr.tEnd > 0 ? latestTr.animElapsed % latestTr.tEnd : 0;
    currentTheta = interpEnergy(latestTr.points, 'theta', tNow, latestTr.tEnd);
    theta0       = latestTr.theta0;
    trColor      = latestTr.ecColor;
  } else {
    currentTheta = pendParams.theta0;
    theta0       = pendParams.theta0;
    trColor      = null;
  }

  // Ceiling
  ctx.strokeStyle = c.gnd; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, pivY); ctx.lineTo(cssW, pivY); ctx.stroke();
  ctx.lineWidth = 1;
  for (let xi = 4; xi < cssW; xi += 14) {
    ctx.beginPath(); ctx.moveTo(xi, pivY); ctx.lineTo(xi - 7, pivY - 9); ctx.stroke();
  }

  // Swing arc
  if (theta0 > 0.005) {
    ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pivX, pivY, L_px, Math.PI / 2 - theta0, Math.PI / 2 + theta0);
    ctx.stroke();
  }

  // Equilibrium dashed line
  ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.setLineDash([5, 6]);
  ctx.beginPath(); ctx.moveTo(pivX, pivY); ctx.lineTo(pivX, pivY + L_px + bobR); ctx.stroke();
  ctx.setLineDash([]);

  // String
  const bobX = pivX + L_px * Math.sin(currentTheta);
  const bobY = pivY + L_px * Math.cos(currentTheta);
  const dark = isDarkMode();
  const strColor = trColor ?? (dark ? '#7a8595' : '#5a6776');
  ctx.strokeStyle = strColor; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(pivX, pivY); ctx.lineTo(bobX, bobY); ctx.stroke();

  // Pivot
  ctx.fillStyle = c.edge; ctx.strokeStyle = c.bg; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(pivX, pivY, 5, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // Bob
  const bobFill = trColor ?? (dark ? '#5fb3d4' : '#2d7d9a');
  ctx.fillStyle = bobFill; ctx.strokeStyle = c.bg; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(bobX, bobY, bobR, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // Label
  ctx.fillStyle = c.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = '11px DM Sans, system-ui, sans-serif';
  ctx.fillText('Péndulo simple', 10, 8);
}

// ─── BOTTOM CANVAS: Ec and Ep together vs time ───────────────────────────────

function computeEnergyBounds(trajectories, preview) {
  let tMax = 1, eMax = 10;
  const all = trajectories.slice();
  if (preview && preview.points.length > 0) all.push(preview);
  for (const tr of all) {
    for (const p of tr.points) {
      if (p.t  > tMax) tMax = p.t;
      if (p.Ec > eMax) eMax = p.Ec;
      if (p.Ep > eMax) eMax = p.Ep;
    }
    if (tr.Em0 != null && tr.Em0 > eMax) eMax = tr.Em0;
    if (tr.Em  != null && tr.Em  > eMax) eMax = tr.Em;
  }
  return { tMax: tMax * 1.08, eMax: eMax * 1.15 };
}

function renderCombinedEnergy(canvas, trajectories, preview, nextColorIdx) {
  const { ctx, cssW, cssH } = setupCanvas(canvas);
  const c = darkColors();

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, cssW, cssH);

  const padL = 64, padR = 18, padT = 28, padB = 36;
  const plotW = cssW - padL - padR;
  const plotH = cssH - padT - padB;

  const { tMax, eMax } = computeEnergyBounds(trajectories, preview);
  const toX = t => padL + (t / tMax) * plotW;
  const toY = e => padT + plotH - (e / eMax) * plotH;

  ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
  ctx.fillStyle   = c.muted;
  ctx.font        = '11px DM Sans, system-ui, sans-serif';

  const xStep = niceStep(tMax);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let v = 0; v <= tMax; v += xStep) {
    const X = toX(v);
    ctx.beginPath(); ctx.moveTo(X, padT); ctx.lineTo(X, padT + plotH); ctx.stroke();
    ctx.fillText(v.toFixed(xStep < 1 ? 1 : 0), X, padT + plotH + 6);
  }

  const yStep = niceStep(eMax);
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let v = 0; v <= eMax; v += yStep) {
    const Y = toY(v);
    ctx.beginPath(); ctx.moveTo(padL, Y); ctx.lineTo(padL + plotW, Y); ctx.stroke();
    ctx.fillText(v.toFixed(yStep < 1 ? 1 : 0), padL - 6, Y);
  }

  ctx.strokeStyle = c.axis; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH);
  ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke();

  ctx.fillStyle = c.text; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.font = '12px DM Sans, system-ui, sans-serif';
  ctx.fillText('t  (s)', padL + plotW / 2, cssH - 4);
  ctx.save(); ctx.translate(14, padT + plotH / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillText('E  (J)', 0, 0); ctx.restore();

  ctx.fillStyle = c.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = '11px DM Sans, system-ui, sans-serif';
  ctx.fillText('Energía', padL + 6, padT + 5);

  // In-chart Ec / Ep legend (top-right)
  const [ecLeg, epLeg] = trajectories.length > 0
    ? [trajectories[0].ecColor, trajectories[0].epColor]
    : colorsFor(nextColorIdx);
  drawInChartLegend(ctx, padL + plotW, padT + 5, ecLeg, epLeg, c.text);

  // Preview: dashed Ec and Ep curves in upcoming colors
  if (preview && preview.points.length >= 2) {
    const [ecPrev, epPrev] = colorsFor(nextColorIdx);
    ctx.globalAlpha = 0.45; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.5;
    ctx.strokeStyle = ecPrev; drawEnergyCurve(ctx, preview.points, 'Ec', toX, toY);
    ctx.strokeStyle = epPrev; drawEnergyCurve(ctx, preview.points, 'Ep', toX, toY);
    ctx.setLineDash([]); ctx.globalAlpha = 1;

    // Em₀ reference line for preview
    const previewEm = preview.Em ?? preview.Em0;
    if (previewEm != null && previewEm > 0) {
      ctx.strokeStyle = c.muted; ctx.lineWidth = 1; ctx.setLineDash([2, 6]);
      ctx.beginPath();
      ctx.moveTo(padL, toY(previewEm)); ctx.lineTo(padL + plotW, toY(previewEm));
      ctx.stroke(); ctx.setLineDash([]);
    }
  }

  // Saved trajectories
  trajectories.forEach((tr) => {
    const tStop = tr.tEnd;
    const tNow  = tr.loop
      ? (tStop > 0 ? tr.animElapsed % tStop : 0)
      : Math.max(0, Math.min(tStop, tr.animElapsed ?? tStop));
    const Em0   = tr.Em0 ?? tr.Em;

    // Subtle Em₀ reference line
    if (Em0 != null && Em0 > 0) {
      ctx.save();
      ctx.globalAlpha = 0.22; ctx.strokeStyle = tr.ecColor; ctx.lineWidth = 1;
      ctx.setLineDash([2, 5]);
      ctx.beginPath(); ctx.moveTo(padL, toY(Em0)); ctx.lineTo(padL + plotW, toY(Em0));
      ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    }

    // Ec and Ep curves (full for looping, progressive reveal for non-looping)
    ctx.strokeStyle = tr.ecColor; ctx.lineWidth = 2.2;
    if (tr.loop) drawEnergyCurve(ctx, tr.points, 'Ec', toX, toY);
    else         drawEnergyCurveUpTo(ctx, tr.points, 'Ec', tNow, toX, toY);

    ctx.strokeStyle = tr.epColor; ctx.lineWidth = 2.2;
    if (tr.loop) drawEnergyCurve(ctx, tr.points, 'Ep', toX, toY);
    else         drawEnergyCurveUpTo(ctx, tr.points, 'Ep', tNow, toX, toY);

    // Two animated dots
    if (tStop > 0) {
      const Ec = interpEnergy(tr.points, 'Ec', tNow, tStop);
      const Ep = interpEnergy(tr.points, 'Ep', tNow, tStop);
      ctx.strokeStyle = c.bg; ctx.lineWidth = 1.5;
      ctx.fillStyle = tr.ecColor;
      ctx.beginPath(); ctx.arc(toX(tNow), toY(Ec), 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = tr.epColor;
      ctx.beginPath(); ctx.arc(toX(tNow), toY(Ep), 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
  });
}

function drawInChartLegend(ctx, rx, ry, ecColor, epColor, textColor) {
  ctx.save();
  ctx.textBaseline = 'top'; ctx.font = '11px DM Sans, system-ui, sans-serif'; ctx.lineWidth = 2;
  ctx.strokeStyle = epColor;
  ctx.beginPath(); ctx.moveTo(rx - 24, ry + 5); ctx.lineTo(rx - 6, ry + 5); ctx.stroke();
  ctx.fillStyle = textColor; ctx.textAlign = 'right'; ctx.fillText('Ep', rx - 27, ry);
  ctx.strokeStyle = ecColor;
  ctx.beginPath(); ctx.moveTo(rx - 62, ry + 5); ctx.lineTo(rx - 44, ry + 5); ctx.stroke();
  ctx.fillText('Ec', rx - 65, ry);
  ctx.restore();
}

function interpEnergy(points, key, t, tEnd) {
  if (points.length === 0) return 0;
  if (tEnd <= 0) return points[0][key];
  const frac   = Math.max(0, Math.min(1, t / tEnd));
  const rawIdx = frac * (points.length - 1);
  const i0     = Math.floor(rawIdx);
  const i1     = Math.min(i0 + 1, points.length - 1);
  return points[i0][key] + (rawIdx - i0) * (points[i1][key] - points[i0][key]);
}

function drawEnergyCurve(ctx, points, key, toX, toY) {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(toX(points[0].t), toY(points[0][key]));
  for (let i = 1; i < points.length; i++) ctx.lineTo(toX(points[i].t), toY(points[i][key]));
  ctx.stroke();
}

function drawEnergyCurveUpTo(ctx, points, key, tCut, toX, toY) {
  if (points.length < 2 || tCut <= 0) return;
  ctx.beginPath();
  ctx.moveTo(toX(points[0].t), toY(points[0][key]));
  let i = 1;
  for (; i < points.length && points[i].t <= tCut; i++)
    ctx.lineTo(toX(points[i].t), toY(points[i][key]));
  if (i < points.length) {
    const a = points[i - 1], b = points[i];
    const u = (tCut - a.t) / (b.t - a.t);
    ctx.lineTo(toX(tCut), toY(a[key] + u * (b[key] - a[key])));
  }
  ctx.stroke();
}
