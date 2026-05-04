// simulations/gravity/physics.js
//
// Two-body gravitational attraction. Distances are measured directly in
// canvas pixels and treated as arbitrary units; G is chosen so that the
// default scenario produces nicely readable force values.

const G          = 2000;    // tuned so F values land in the 1–500 range
const SOFTENING2 = 1e-3;    // ε² added to r² to keep accelerations finite

// |F| = G · m₁ · m₂ / r²
function gravForce(m1, m2, r) {
  return G * m1 * m2 / (r * r + SOFTENING2);
}

// Acceleration vectors on (b1, b2) under their mutual gravitational pull.
function computeAccel(b1, b2) {
  const dx = b2.x - b1.x;
  const dy = b2.y - b1.y;
  const r2 = dx*dx + dy*dy + SOFTENING2;
  const r  = Math.sqrt(r2);
  const F  = G * b1.mass * b2.mass / r2;   // |F| (same on both)
  const fx = F * dx / r;                   // signed force on b1 toward b2
  const fy = F * dy / r;
  return [
    { x:  fx / b1.mass, y:  fy / b1.mass },
    { x: -fx / b2.mass, y: -fy / b2.mass },
  ];
}

// Velocity-Verlet step (symplectic, energy-conserving on average).
function physicsStep(b1, b2, dt) {
  const a0 = computeAccel(b1, b2);
  b1.x += b1.vx * dt + 0.5 * a0[0].x * dt * dt;
  b1.y += b1.vy * dt + 0.5 * a0[0].y * dt * dt;
  b2.x += b2.vx * dt + 0.5 * a0[1].x * dt * dt;
  b2.y += b2.vy * dt + 0.5 * a0[1].y * dt * dt;
  const a1 = computeAccel(b1, b2);
  b1.vx += 0.5 * (a0[0].x + a1[0].x) * dt;
  b1.vy += 0.5 * (a0[0].y + a1[0].y) * dt;
  b2.vx += 0.5 * (a0[1].x + a1[1].x) * dt;
  b2.vy += 0.5 * (a0[1].y + a1[1].y) * dt;
}

if (typeof module !== 'undefined') {
  module.exports = { G, gravForce, computeAccel, physicsStep };
}
