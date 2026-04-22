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
