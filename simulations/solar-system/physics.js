// simulations/solar-system/physics.js
//
// Pure 2-D N-body gravity. No DOM access, no globals other than the few
// exports below — testable in Node.

const G          = 1;       // normalised gravitational constant
const SOFTENING2 = 1e-3;    // ε² added to r² to keep accelerations finite

// Default orbital parameters. Hierarchical Keplerian setup that yields a
// reasonably stable Sun-centred system in normalised units. Distances are
// compressed for the outer planets so they fit on screen; masses are
// compressed too so mutual perturbations don't destabilise the inner
// planets over short runs.
//   Planet orbital v_circ = √(G·M☉/r)
//   Moon   orbital v_circ = √(G·M⊕/r_moon)
const DEFAULT_PARAMS = {
  sunMass:        1000,

  mercuryMass:       5,    mercuryRadius:    80,   mercurySpeed:    1.0,
  venusMass:        18,    venusRadius:     145,   venusSpeed:      1.0,
  earthMass:        20,    earthRadius:     200,   earthSpeed:      1.0,
  moonMass:        0.5,    moonRadius:       15,   moonSpeed:       1.0,   // orbits Earth
  marsMass:          8,    marsRadius:      280,   marsSpeed:       1.0,
  jupiterMass:      50,    jupiterRadius:   500,   jupiterSpeed:    1.0,
  saturnMass:       35,    saturnRadius:    700,   saturnSpeed:     1.0,
  uranusMass:       18,    uranusRadius:    850,   uranusSpeed:     1.0,
  neptuneMass:      22,    neptuneRadius:  1000,   neptuneSpeed:    1.0,
};

// Visual constants per body — kept fixed regardless of mass slider so the
// hierarchy stays readable at a glance.
const BODY_VISUAL = {
  Sun:     { color: '#ffb84d', radius: 11, glow: 32 },
  Mercury: { color: '#a8a8a8', radius: 3,  glow: 7  },
  Venus:   { color: '#e8c878', radius: 4,  glow: 10 },
  Earth:   { color: '#4a90e2', radius: 5,  glow: 14 },
  Moon:    { color: '#cfcfcf', radius: 3,  glow: 8  },
  Mars:    { color: '#cd5c2c', radius: 4,  glow: 10 },
  Jupiter: { color: '#d4a574', radius: 8,  glow: 22 },
  Saturn:  { color: '#e8d090', radius: 7,  glow: 18 },
  Uranus:  { color: '#88d4d4', radius: 6,  glow: 14 },
  Neptune: { color: '#4060c8', radius: 6,  glow: 14 },
};

// Starting angles (rad) — distribute the planets around the Sun so they
// aren't all aligned on the +x axis at t=0.
const START_ANGLES = {
  Mercury: 0,
  Venus:   Math.PI / 4,
  Earth:   Math.PI / 2,
  Mars:    3 * Math.PI / 4,
  Jupiter: Math.PI,
  Saturn:  5 * Math.PI / 4,
  Uranus:  3 * Math.PI / 2,
  Neptune: 7 * Math.PI / 4,
};

function buildBodies(p) {
  // Place a body on a circular orbit of given radius around the Sun, at
  // starting angle θ, moving CCW.
  function planetAt(name, mass, radius, speedFactor, theta) {
    const v = Math.sqrt(G * p.sunMass / radius) * speedFactor;
    return {
      name, mass,
      x:  radius * Math.cos(theta),
      y:  radius * Math.sin(theta),
      vx: -v * Math.sin(theta),
      vy:  v * Math.cos(theta),
    };
  }

  const mercury = planetAt('Mercury', p.mercuryMass, p.mercuryRadius, p.mercurySpeed, START_ANGLES.Mercury);
  const venus   = planetAt('Venus',   p.venusMass,   p.venusRadius,   p.venusSpeed,   START_ANGLES.Venus);
  const earth   = planetAt('Earth',   p.earthMass,   p.earthRadius,   p.earthSpeed,   START_ANGLES.Earth);
  const mars    = planetAt('Mars',    p.marsMass,    p.marsRadius,    p.marsSpeed,    START_ANGLES.Mars);
  const jupiter = planetAt('Jupiter', p.jupiterMass, p.jupiterRadius, p.jupiterSpeed, START_ANGLES.Jupiter);
  const saturn  = planetAt('Saturn',  p.saturnMass,  p.saturnRadius,  p.saturnSpeed,  START_ANGLES.Saturn);
  const uranus  = planetAt('Uranus',  p.uranusMass,  p.uranusRadius,  p.uranusSpeed,  START_ANGLES.Uranus);
  const neptune = planetAt('Neptune', p.neptuneMass, p.neptuneRadius, p.neptuneSpeed, START_ANGLES.Neptune);

  // Moon orbits Earth, offset radially outward from Earth's current direction
  // and given Earth's velocity plus its own circular orbit around Earth.
  const moonAng = START_ANGLES.Earth;
  const vMoon   = Math.sqrt(G * p.earthMass / p.moonRadius) * p.moonSpeed;
  const moon = {
    name: 'Moon', mass: p.moonMass,
    x:  earth.x +     p.moonRadius * Math.cos(moonAng),
    y:  earth.y +     p.moonRadius * Math.sin(moonAng),
    vx: earth.vx + (-vMoon * Math.sin(moonAng)),
    vy: earth.vy + ( vMoon * Math.cos(moonAng)),
  };

  const bodies = [
    { name: 'Sun', mass: p.sunMass, x: 0, y: 0, vx: 0, vy: 0 },
    mercury, venus, earth, moon, mars, jupiter, saturn, uranus, neptune,
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
    G, DEFAULT_PARAMS, BODY_VISUAL, START_ANGLES,
    buildBodies, freshBodies, accelerations, verletStep,
  };
}
