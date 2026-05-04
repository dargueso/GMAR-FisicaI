// physics.js — Inclined plane physics (no rolling, sliding friction)

function computePhysics(m, angleDeg, mu, g) {
  const theta  = angleDeg * Math.PI / 180;
  const W      = m * g;
  const W_perp = W * Math.cos(theta);   // perpendicular to plane
  const W_par  = W * Math.sin(theta);   // parallel to plane, down-slope
  const N      = W_perp;               // N = W_perp (no perpendicular acceleration)
  const f_max  = mu * N;               // max static / kinetic friction

  let f, a, sliding;
  if (W_par > f_max + 1e-9) {
    sliding = true;
    f = f_max;
    a = g * (Math.sin(theta) - mu * Math.cos(theta));
  } else {
    sliding = false;
    f = W_par;  // static friction exactly balances W_par
    a = 0;
  }

  return { W, W_perp, W_par, N, f, a, sliding, theta };
}
