// simulations/coriolis/renderer.js

const NH_CONTINENTS = [
  // North America
  [[72,-80],[65,-55],[50,-56],[45,-64],[30,-80],[25,-90],[25,-108],[32,-117],
   [38,-122],[48,-124],[56,-132],[60,-140],[68,-140],[70,-130],[72,-80]],
  // Greenland
  [[76,-65],[82,-45],[83,-20],[76,-18],[72,-22],[68,-32],[68,-52],[72,-58],[76,-65]],
  // Eurasia
  [[70,30],[72,70],[70,140],[60,140],[50,140],[40,130],[35,120],[25,115],[20,90],
   [25,56],[30,55],[38,38],[42,28],[40,20],[36,26],[42,32],[50,28],[55,22],
   [60,12],[65,15],[70,30]],
  // North Africa
  [[36,-5],[35,10],[30,32],[22,38],[12,44],[5,40],[0,32],[0,14],[-5,10],
   [-5,0],[0,-5],[5,-15],[15,-17],[22,-17],[28,-13],[35,-5],[36,-5]],
];

const SH_CONTINENTS = [
  // South America
  [[10,-75],[0,-50],[-10,-37],[-20,-40],[-30,-50],[-38,-57],[-55,-65],
   [-55,-72],[-45,-73],[-35,-72],[-25,-68],[-15,-75],[-8,-80],[0,-80],[5,-78],[10,-75]],
  // Southern Africa
  [[5,35],[0,42],[-10,40],[-20,36],[-34,26],[-34,18],[-28,15],[-15,12],[0,9],[5,2],[5,35]],
  // Australia
  [[-15,130],[-15,138],[-15,145],[-22,150],[-30,153],[-38,147],[-40,145],
   [-38,138],[-35,137],[-32,133],[-30,115],[-22,114],[-17,122],[-15,130]],
];

/**
 * Convert metres in disc coords → canvas pixel coords.
 * @param {number} x  metres East
 * @param {number} y  metres "up on disc"
 * @param {number} cx canvas disc centre x
 * @param {number} cy canvas disc centre y
 * @param {number} scale  pixels per metre  (= discRadius / EQ_RADIUS)
 * @returns {{px: number, py: number}}
 */
function metersToCanvas(x, y, cx, cy, scale) {
  return { px: cx + x * scale, py: cy - y * scale };
}

/**
 * Draw the hemisphere disc: ocean fill, glow, graticule, continent outlines.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx  disc centre x
 * @param {number} cy  disc centre y
 * @param {number} r   disc radius in pixels
 * @param {string} hemisphere  'NH' | 'SH'
 * @param {number} scale  pixels per metre
 */
function drawDisc(ctx, cx, cy, r, hemisphere, scale) {
  // Ocean fill
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = '#1a3a4a';
  ctx.shadowColor = '#2a7a8a';
  ctx.shadowBlur = 20;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.restore();

  // Clip all subsequent drawing to the disc
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  _drawGraticule(ctx, cx, cy, r, scale);
  _drawContinents(ctx, cx, cy, hemisphere, scale);

  ctx.restore();

  // Disc border
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = '#2a7a8a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function _drawGraticule(ctx, cx, cy, r, scale) {
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 0.8;

  // Latitude circles every 30° from the pole
  for (let step = 30; step <= 90; step += 30) {
    const angDist  = step * Math.PI / 180;   // radians from pole (same for NH/SH)
    const rCircle  = 6_371_000 * angDist * scale;
    if (rCircle > r + 1) continue;
    ctx.beginPath();
    ctx.arc(cx, cy, rCircle, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Longitude lines every 30°
  for (let lon = 0; lon < 360; lon += 30) {
    const lonRad = lon * Math.PI / 180;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + r * Math.sin(lonRad), cy - r * Math.cos(lonRad));
    ctx.stroke();
  }
}

function _drawContinents(ctx, cx, cy, hemisphere, scale) {
  const R = 6_371_000;
  const contours = hemisphere === 'NH' ? NH_CONTINENTS : SH_CONTINENTS;

  ctx.fillStyle = 'rgba(100,130,100,0.55)';
  ctx.strokeStyle = 'rgba(140,170,140,0.7)';
  ctx.lineWidth = 0.8;

  for (const polygon of contours) {
    ctx.beginPath();
    for (let i = 0; i < polygon.length; i++) {
      const [lat, lon] = polygon[i];
      const angDist = hemisphere === 'NH'
        ? (90 - lat) * Math.PI / 180
        : (90 + lat) * Math.PI / 180;
      const rm = R * angDist;
      const lonRad = lon * Math.PI / 180;
      const px = cx + rm * Math.sin(lonRad) * scale;
      const py = cy - rm * Math.cos(lonRad) * scale;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

/**
 * Draw a crosshair at a disc position (initial position marker).
 */
function drawCrosshair(ctx, px, py) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 1;
  const s = 8;
  ctx.beginPath();
  ctx.moveTo(px - s, py); ctx.lineTo(px + s, py);
  ctx.moveTo(px, py - s); ctx.lineTo(px, py + s);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw the accumulating trail as a polyline.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<{px,py}>} trail  array of canvas-pixel positions
 */
function drawTrail(ctx, trail) {
  if (trail.length < 2) return;
  ctx.save();
  ctx.strokeStyle = '#f0a500';
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(trail[0].px, trail[0].py);
  for (let i = 1; i < trail.length; i++) ctx.lineTo(trail[i].px, trail[i].py);
  ctx.stroke();
  ctx.restore();
}

/**
 * Draw particle with motion-blur effect (ghost at previous positions).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} px  current canvas x
 * @param {number} py  current canvas y
 * @param {Array<{px,py}>} trail  for ghost positions
 */
function drawParticle(ctx, px, py, trail) {
  const ghosts = trail.slice(-4);
  const alphas = [0.1, 0.2, 0.35, 0.55];
  const offset = 4 - ghosts.length;  // newest ghost always gets alpha 0.55
  for (let i = 0; i < ghosts.length; i++) {
    ctx.save();
    ctx.globalAlpha = alphas[offset + i];
    ctx.beginPath();
    ctx.arc(ghosts[i].px, ghosts[i].py, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = '#ffffff';
  ctx.shadowBlur = 8;
  ctx.fill();
  ctx.restore();
}

/**
 * Draw an arrow from (x,y) in direction (dx,dy) with given color.
 * dx,dy are in canvas pixel units (positive dy = downward).
 * Length clamped to [minLen, maxLen].
 */
function drawArrow(ctx, x, y, dx, dy, color, minLen = 10, maxLen = 55) {
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag < 1e-10) return;
  const len = Math.max(minLen, Math.min(maxLen, mag));
  const nx = dx / mag;
  const ny = dy / mag;
  const ex = x + nx * len;
  const ey = y + ny * len;
  const headLen = 8;
  const angle = Math.atan2(ny, nx);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(ex, ey);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - headLen * Math.cos(angle - 0.4), ey - headLen * Math.sin(angle - 0.4));
  ctx.lineTo(ex - headLen * Math.cos(angle + 0.4), ey - headLen * Math.sin(angle + 0.4));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

const ARROW_VEL_SCALE = 0.04;    // pixels per m/s for velocity arrow
const ARROW_COR_SCALE = 50000;   // pixels per (m/s²) for Coriolis arrow

/**
 * Draw velocity (white) and Coriolis force (cyan) arrows on the particle.
 *
 * Coordinate note: physics y is "up on disc", canvas y increases downward.
 * Canvas mapping: canvas_dx = phys_dx, canvas_dy = -phys_dy.
 *
 * Velocity: (vx, vy) in physics → canvas arrow (vx, -vy).
 * Coriolis: physics (ax, ay) = (f×vy, -f×vx) → canvas (f×vy, f×vx).
 *
 * @param {number} vx  m/s East (physics x)
 * @param {number} vy  m/s "up on disc" (physics y)
 * @param {number} f   Coriolis parameter (rad/s)
 */
function drawAnnotations(ctx, px, py, vx, vy, f) {
  // Velocity arrow — flip physics y to canvas y
  drawArrow(ctx, px, py, vx * ARROW_VEL_SCALE, -vy * ARROW_VEL_SCALE, '#ffffff');

  // Coriolis acceleration in canvas coords: (f×vy, f×vx)
  // (physics dvy/dt = -f×vx → canvas_dy = -physics_dy = +f×vx)
  drawArrow(ctx, px, py, f * vy * ARROW_COR_SCALE, f * vx * ARROW_COR_SCALE, '#00d4d4');
}

/**
 * Draw info box (speed, deflection, elapsed time) in top-right of canvas.
 */
function drawInfoBox(ctx, canvasW, speed, deflection, elapsed) {
  const lines = [
    `Speed: ${speed.toFixed(0)} m/s`,
    `Deflection: ${deflection.toFixed(1)}°`,
    `Time: ${(elapsed / 3600).toFixed(2)} h`,
  ];
  const x = canvasW - 12;
  const y0 = 14;
  ctx.save();
  ctx.font = '11px monospace';
  ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x - 130, y0 - 12, 134, lines.length * 16 + 6);
  ctx.fillStyle = '#c0c0c0';
  for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, y0 + i * 16);
  ctx.restore();
}
