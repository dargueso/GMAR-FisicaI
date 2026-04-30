// simulations/projectile/physics.js
// Classical projectile motion (no air resistance). Ground is y = 0; flight ends
// when the projectile returns to y = 0 (or earlier, on positive g; never, on
// non-positive g).

function projectileAnalytics(v0, angleDeg, g, h0) {
  const θ   = angleDeg * Math.PI / 180;
  const vx  = v0 * Math.cos(θ);
  const vy0 = v0 * Math.sin(θ);

  // Apex (only meaningful for g > 0 and vy0 > 0).
  const tApex = (g > 0 && vy0 > 0) ? vy0 / g : 0;
  const hMax  = h0 + (g > 0 ? (vy0 * vy0) / (2 * g) : 0);

  // Flight time: solve  h0 + vy0·t − ½ g t² = 0  for t > 0.
  let tFlight = 0;
  if (g > 0) {
    const disc = vy0 * vy0 + 2 * g * h0;
    if (disc >= 0) tFlight = (vy0 + Math.sqrt(disc)) / g;
  }
  const range = vx * tFlight;

  return { vx, vy0, tApex, hMax, tFlight, range };
}

// Sample the trajectory between t=0 and tFlight (inclusive).
function sampleTrajectory(v0, angleDeg, g, h0, nSamples = 200) {
  const a   = projectileAnalytics(v0, angleDeg, g, h0);
  const pts = [];
  if (a.tFlight <= 0) {
    pts.push({ x: 0, y: h0, t: 0 });
    return { points: pts, ...a };
  }
  for (let i = 0; i <= nSamples; i++) {
    const t = (i / nSamples) * a.tFlight;
    pts.push({
      x: a.vx  * t,
      y: h0 + a.vy0 * t - 0.5 * g * t * t,
      t,
    });
  }
  return { points: pts, ...a };
}
