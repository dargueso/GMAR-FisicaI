// simulations/solar-system/physics.js
//
// Pure 2-D N-body gravity. No DOM access, no globals other than the few
// exports below — testable in Node.

const G          = 1;       // normalised gravitational constant
const SOFTENING2 = 1e-3;    // ε² added to r² to keep accelerations finite

// Default orbital parameters. Hierarchical Keplerian setup that yields a
// stable Sun · Earth · Moon · Jupiter system in normalised units:
//   Earth/Jupiter orbital v_circ = √(G·M☉/r)
//   Moon orbital           v_circ = √(G·M⊕/r_moon)
// Earth Hill radius ≈ 200·(20/3000)^⅓ ≈ 37, so r_moon = 15 is comfortably
// inside Earth's gravitational dominance. Jupiter is placed at r=500 so it
// only mildly perturbs the inner system.
const DEFAULT_PARAMS = {
  sunMass:        1000,
  earthMass:        20,
  earthRadius:     200,    // Earth–Sun distance
  earthSpeed:      1.0,    // factor on circular-orbit velocity (1 = circular)
  moonMass:        0.5,
  moonRadius:       15,    // Moon–Earth distance
  moonSpeed:       1.0,
  jupiterMass:      50,
  jupiterRadius:   500,    // Jupiter–Sun distance
  jupiterSpeed:    1.0,
};

// Visual constants per body — kept fixed regardless of mass slider so the
// hierarchy (Sun > Jupiter > Earth > Moon) stays readable at a glance.
const BODY_VISUAL = {
  Sun:     { color: '#ffb84d', radius: 11, glow: 32 },
  Earth:   { color: '#4a90e2', radius: 5,  glow: 14 },
  Moon:    { color: '#cfcfcf', radius: 3,  glow: 8  },
  Jupiter: { color: '#d4a574', radius: 8,  glow: 22 },
};

function buildBodies(p) {
  const earthV   = Math.sqrt(G * p.sunMass   / p.earthRadius)   * p.earthSpeed;
  const moonV    = earthV
                 + Math.sqrt(G * p.earthMass / p.moonRadius)    * p.moonSpeed;
  const jupiterV = Math.sqrt(G * p.sunMass   / p.jupiterRadius) * p.jupiterSpeed;

  // Jupiter starts on the opposite side of the Sun from Earth so the inner
  // and outer systems are visually separated at t = 0. Both orbit CCW.
  const bodies = [
    { name: 'Sun',     mass: p.sunMass,
      x: 0, y: 0, vx: 0, vy: 0 },
    { name: 'Earth',   mass: p.earthMass,
      x: p.earthRadius, y: 0, vx: 0, vy: earthV },
    { name: 'Moon',    mass: p.moonMass,
      x: p.earthRadius + p.moonRadius, y: 0, vx: 0, vy: moonV },
    { name: 'Jupiter', mass: p.jupiterMass,
      x: -p.jupiterRadius, y: 0, vx: 0, vy: -jupiterV },
  ];

  // Zero net momentum: bake the small counter-velocity into the Sun so the
  // system stays roughly centred on the canvas during long runs.
  let pX = 0, pY = 0;
  for (const b of bodies) { pX += b.mass * b.vx; pY += b.mass * b.vy; }
  bodies[0].vx = -pX / bodies[0].mass;
  bodies[0].vy = -pY / bodies[0].mass;

  return bodies.map(b => ({
    ...b,
    ...BODY_VISUAL[b.name],
    active: true,
    trail:  [],
  }));
}

function freshBodies() { return buildBodies(DEFAULT_PARAMS); }

// a_i = G · Σ_{j≠i} m_j · (r_j − r_i) / |r_j − r_i|³
function accelerations(active) {
  const acc = active.map(() => ({ x: 0, y: 0 }));
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const dx = active[j].x - active[i].x;
      const dy = active[j].y - active[i].y;
      const r2 = dx*dx + dy*dy + SOFTENING2;
      const invR3 = G / (r2 * Math.sqrt(r2));
      acc[i].x += invR3 * dx * active[j].mass;
      acc[i].y += invR3 * dy * active[j].mass;
      acc[j].x -= invR3 * dx * active[i].mass;
      acc[j].y -= invR3 * dy * active[i].mass;
    }
  }
  return acc;
}

// One velocity-Verlet step (symplectic, energy-conserving on average).
function verletStep(active, dt) {
  if (active.length === 0) return;
  const a0 = accelerations(active);
  for (let i = 0; i < active.length; i++) {
    const b = active[i];
    b.x += b.vx * dt + 0.5 * a0[i].x * dt * dt;
    b.y += b.vy * dt + 0.5 * a0[i].y * dt * dt;
  }
  const a1 = accelerations(active);
  for (let i = 0; i < active.length; i++) {
    const b = active[i];
    b.vx += 0.5 * (a0[i].x + a1[i].x) * dt;
    b.vy += 0.5 * (a0[i].y + a1[i].y) * dt;
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    G, DEFAULT_PARAMS, BODY_VISUAL,
    buildBodies, freshBodies, accelerations, verletStep,
  };
}
