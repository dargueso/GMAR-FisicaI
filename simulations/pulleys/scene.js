// poleas/scene.js

function isDarkMode() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
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
    bg:   dark ? '#222831' : '#ffffff',
    axis: dark ? '#7a8595' : '#5a6776',
    grid: dark ? '#3b4252' : '#e2e8f0',
    text: dark ? '#d0d8e4' : '#1f2937',
    muted:dark ? '#8f9ba8' : '#6b7280',
    ramp: dark ? '#4c566a' : '#dde3ed',
    edge: dark ? '#7a8595' : '#8899aa',
    gnd:  dark ? '#4c566a' : '#cbd5e1',
  };
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

// Arrow from (x1,y1) to (x2,y2). labelSide = 'left' | 'right'.
function drawArrow(ctx, x1, y1, x2, y2, color, label, labelSide) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 4) return;
  const nx = dx / len, ny = dy / len;
  const hs = 9;

  ctx.strokeStyle = color; ctx.fillStyle = color;
  ctx.lineWidth = 2.2; ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2 - nx * hs * 0.75, y2 - ny * hs * 0.75);
  ctx.stroke();

  const px = -ny * hs * 0.42, py = nx * hs * 0.42;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - nx * hs + px, y2 - ny * hs + py);
  ctx.lineTo(x2 - nx * hs - px, y2 - ny * hs - py);
  ctx.closePath(); ctx.fill();

  if (label) {
    ctx.font = 'bold 12px DM Sans, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    if (labelSide === 'right') { ctx.textAlign = 'left';  ctx.fillText(label, mx + 10, my); }
    else                       { ctx.textAlign = 'right'; ctx.fillText(label, mx - 10, my); }
  }
}

// ─── TOP CANVAS: Atwood machine scene ────────────────────────────────────────
// M=0 → massless pulley (T1=T2). M>0 → massive disk pulley (T1≠T2).

function renderAtwoodScene(canvas, d_now, m1, m2, g, M = 0, R = 0) {
  const { ctx, cssW, cssH } = setupCanvas(canvas);
  const c    = darkColors();
  const dark = isDarkMode();
  const massive = M > 0;

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, cssW, cssH);

  // ── Geometry ──
  const ceilY   = 14;
  const pulleyR = Math.min(72, cssW * 0.105);
  const pulex   = cssW / 2;
  const puley   = ceilY + pulleyR;

  const m1x   = pulex - pulleyR;
  const m2x   = pulex + pulleyR;
  const massW = Math.min(50, pulleyR * 0.75);
  const massH = Math.min(46, cssH * 0.115);

  const padB   = 32;
  const loY    = puley + pulleyR + massH / 2 + 10;
  const hiY    = cssH - padB - massH / 2;
  const midY   = (loY + hiY) / 2;
  const travPx = (hiY - loY) / 2;
  const scaleY = travPx / P_MAX_TRAVEL;

  const dPx  = Math.max(-travPx, Math.min(travPx, d_now * scaleY));
  const m1CY = midY - dPx;
  const m2CY = midY + dPx;

  // ── Ceiling ──
  ctx.strokeStyle = c.gnd; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, ceilY); ctx.lineTo(cssW, ceilY); ctx.stroke();
  ctx.lineWidth = 1;
  for (let xi = 4; xi < cssW; xi += 14) {
    ctx.beginPath(); ctx.moveTo(xi, ceilY); ctx.lineTo(xi - 7, ceilY - 9); ctx.stroke();
  }

  // ── Pulley ──
  ctx.strokeStyle = c.edge; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(pulex, ceilY); ctx.lineTo(pulex, puley); ctx.stroke();

  ctx.fillStyle = c.edge; ctx.strokeStyle = c.bg; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(pulex, ceilY, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Wheel body — thicker stroke for massive pulley
  ctx.fillStyle   = massive
    ? (dark ? '#4a5a7a' : '#c8d4e8')
    : (dark ? '#4c566a' : '#dde3ed');
  ctx.strokeStyle = dark ? '#7a8595' : '#8899aa';
  ctx.lineWidth   = massive ? 4 : 2.5;
  ctx.beginPath(); ctx.arc(pulex, puley, pulleyR, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();

  // Groove ring
  ctx.strokeStyle = dark ? '#3b4252' : '#c0cbd8'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(pulex, puley, pulleyR * 0.68, 0, Math.PI * 2); ctx.stroke();

  // Centre axle pin
  ctx.fillStyle = c.edge; ctx.strokeStyle = c.bg; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(pulex, puley, 5, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

  // Annotation for massive pulley (M and R, to the right of wheel)
  if (massive) {
    const ax = pulex + pulleyR + 8;
    const ay = puley;
    ctx.fillStyle = c.muted;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.font = '10px DM Sans, system-ui, sans-serif';
    ctx.fillText(`M = ${M} kg`, ax, ay - 7);
    ctx.fillText(`R = ${R} m`,  ax, ay + 7);
  }

  // ── String ──
  const ropeColor = dark ? '#8f9ba8' : '#5a6776';
  ctx.strokeStyle = ropeColor; ctx.lineWidth = 2; ctx.lineCap = 'round';

  ctx.beginPath(); ctx.moveTo(m1x, m1CY - massH / 2); ctx.lineTo(m1x, puley); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(m2x, m2CY - massH / 2); ctx.lineTo(m2x, puley); ctx.stroke();
  ctx.beginPath(); ctx.arc(pulex, puley, pulleyR, Math.PI, 0, false); ctx.stroke();

  // ── Force arrows ──
  const { a, T1, T2, W1, W2 } = atwoodAnalytics(m1, m2, g, M, R);
  const tLabel1 = massive ? 'T₁' : 'T';
  const tLabel2 = massive ? 'T₂' : 'T';

  const maxF     = Math.max(W1, W2, T1, T2, 1e-9);
  const maxArrPx = Math.min(cssH * 0.21, travPx * 0.85);
  const wColor   = dark ? '#e07a5f' : '#c0503a';
  const tColor   = dark ? '#5fb3d4' : '#2d7d9a';

  const t1Len = T1 / maxF * maxArrPx;
  const t2Len = T2 / maxF * maxArrPx;
  const w1Len = W1 / maxF * maxArrPx;
  const w2Len = W2 / maxF * maxArrPx;
  const aOff  = massW * 0.30;

  const m1T = m1CY - massH / 2;
  const m1B = m1CY + massH / 2;
  drawArrow(ctx, m1x + aOff, m1T, m1x + aOff, m1T - t1Len, tColor, tLabel1, 'left');
  drawArrow(ctx, m1x - aOff, m1B, m1x - aOff, m1B + w1Len, wColor, 'W₁',    'left');

  const m2T = m2CY - massH / 2;
  const m2B = m2CY + massH / 2;
  drawArrow(ctx, m2x - aOff, m2T, m2x - aOff, m2T - t2Len, tColor, tLabel2, 'right');
  drawArrow(ctx, m2x + aOff, m2B, m2x + aOff, m2B + w2Len, wColor, 'W₂',    'right');

  // ── Masses ──
  ctx.fillStyle   = dark ? '#3aa776' : '#27835f';
  ctx.strokeStyle = c.bg; ctx.lineWidth = 2;
  ctx.fillRect(m1x - massW/2, m1CY - massH/2, massW, massH);
  ctx.strokeRect(m1x - massW/2, m1CY - massH/2, massW, massH);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `bold ${Math.min(14, massH * 0.33)}px DM Sans, system-ui, sans-serif`;
  ctx.fillText('m₁', m1x, m1CY);

  ctx.fillStyle   = dark ? '#b06ab3' : '#7c3d7c';
  ctx.strokeStyle = c.bg; ctx.lineWidth = 2;
  ctx.fillRect(m2x - massW/2, m2CY - massH/2, massW, massH);
  ctx.strokeRect(m2x - massW/2, m2CY - massH/2, massW, massH);
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('m₂', m2x, m2CY);

  // ── Legend ──
  ctx.fillStyle = c.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = '11px DM Sans, system-ui, sans-serif';
  ctx.fillText(massive ? 'Polea con masa (disco)' : 'Máquina de Atwood', 8, 8);

  const ly = cssH - 14;
  ctx.fillStyle = wColor; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillRect(8, ly - 4, 18, 3);
  ctx.fillStyle = c.muted;
  ctx.fillText('Peso  W = mg', 30, ly);

  const tx2 = massive ? 0.40 : 0.38;
  ctx.fillStyle = tColor;
  ctx.fillRect(cssW * tx2, ly - 4, 18, 3);
  ctx.fillStyle = c.muted;
  ctx.fillText(massive ? 'Tensiones T₁, T₂' : 'Tensión T', cssW * tx2 + 22, ly);
}

// ─── BOTTOM CANVAS: velocity vs time ─────────────────────────────────────────

function renderAtwoodGraph(canvas, data, elapsed) {
  const { ctx, cssW, cssH } = setupCanvas(canvas);
  const c    = darkColors();
  const dark = isDarkMode();

  ctx.fillStyle = c.bg;
  ctx.fillRect(0, 0, cssW, cssH);

  const padL = 64, padR = 18, padT = 28, padB = 36;
  const plotW = cssW - padL - padR;
  const plotH = cssH - padT - padB;

  const { a, tEnd } = data;
  const absA = Math.abs(a);
  const vMax = (absA * tEnd * 1.1) || 1;
  const tMax = (tEnd  * 1.1)       || 1;

  const toX = t => padL + (t / tMax) * plotW;
  const toY = v => padT + plotH - (v / vMax) * plotH;

  // ── Grid ──
  ctx.strokeStyle = c.grid; ctx.lineWidth = 1;
  ctx.fillStyle   = c.muted;
  ctx.font        = '11px DM Sans, system-ui, sans-serif';

  const xStep = niceStep(tMax);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let v = 0; v <= tMax + xStep * 0.01; v += xStep) {
    const X = toX(v);
    ctx.beginPath(); ctx.moveTo(X, padT); ctx.lineTo(X, padT + plotH); ctx.stroke();
    ctx.fillText(v.toFixed(xStep < 1 ? 1 : 0), X, padT + plotH + 6);
  }

  const yStep = niceStep(vMax);
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let v = 0; v <= vMax + yStep * 0.01; v += yStep) {
    const Y = toY(v);
    ctx.beginPath(); ctx.moveTo(padL, Y); ctx.lineTo(padL + plotW, Y); ctx.stroke();
    ctx.fillText(v.toFixed(yStep < 1 ? 1 : 0), padL - 6, Y);
  }

  // ── Axes ──
  ctx.strokeStyle = c.axis; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(padL, padT); ctx.lineTo(padL, padT + plotH);
  ctx.lineTo(padL + plotW, padT + plotH); ctx.stroke();

  ctx.fillStyle = c.text; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  ctx.font = '12px DM Sans, system-ui, sans-serif';
  ctx.fillText('t  (s)', padL + plotW / 2, cssH - 4);
  ctx.save(); ctx.translate(14, padT + plotH / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillText('v  (m/s)', 0, 0); ctx.restore();

  ctx.fillStyle = c.muted; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.font = '11px DM Sans, system-ui, sans-serif';
  ctx.fillText('Velocidad del sistema', padL + 6, padT + 5);

  // ── Static case ──
  if (tEnd <= 0) {
    ctx.fillStyle = c.muted; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = '13px DM Sans, system-ui, sans-serif';
    ctx.fillText('Sistema en equilibrio  —  sin movimiento', padL + plotW / 2, padT + plotH / 2);
    return;
  }

  // ── Dashed preview ──
  const vColor = dark ? '#5fb3d4' : '#2d7d9a';
  ctx.strokeStyle = vColor; ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]); ctx.globalAlpha = 0.4;
  ctx.beginPath(); ctx.moveTo(toX(0), toY(0)); ctx.lineTo(toX(tEnd), toY(absA * tEnd));
  ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;

  // ── Animated solid curve ──
  const tNow = Math.max(0, Math.min(tEnd, elapsed));
  if (tNow > 0) {
    ctx.strokeStyle = vColor; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(toX(0), toY(0)); ctx.lineTo(toX(tNow), toY(absA * tNow));
    ctx.stroke();

    const vNow = absA * tNow;
    ctx.fillStyle = vColor; ctx.strokeStyle = c.bg; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(toX(tNow), toY(vNow), 5, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }

  // ── Slope label ──
  if (tNow > tEnd * 0.18) {
    const lt = tEnd * 0.52;
    ctx.fillStyle = vColor; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
    ctx.font = '11px DM Sans, system-ui, sans-serif';
    ctx.fillText(`pendiente = a = ${absA.toFixed(3)} m/s²`, toX(lt) + 8, toY(absA * lt) - 4);
  }
}
