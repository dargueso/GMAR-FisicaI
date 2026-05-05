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
// Defaults are scaled to real solar-system proportions wherever possible.
// Mass unit  = 1 Earth mass (M⊕). Real ratio M_sun / M_earth ≈ 333 000.
// Length unit:  Earth's orbital radius = 200 sim units = 1 AU. All planet
// orbital radii then match real AU values × 200.
//
// With these choices, orbital periods come out correctly:
//   Mercury  ≈ 88 d    Venus   ≈ 225 d   Earth   ≈ 365 d   Mars   ≈ 687 d
//   Jupiter  ≈ 11.9 y  Saturn  ≈ 29.4 y  Uranus  ≈ 84 y    Neptune≈ 165 y
//
// Two intentional exaggerations keep the Earth-Moon system visible:
//   • Earth mass is bumped from the real 1 M⊕ to 20 M⊕ so the Moon at the
//     ~3× exaggerated distance below stays inside Earth's Hill sphere.
//   • Moon distance is set to ~1.5 sim units (real ≈ 0.51 sim units = the
//     Earth–Moon AU ratio of 0.00257 × 200). With Earth mass 20 the Moon
//     period is still ≈ 27 d — the right number, just at a more visible
//     orbital radius.
const DEFAULT_PARAMS = {
  sunMass:        333000,

  mercuryMass:        0.055,    mercuryRadius:    77,     mercurySpeed:    1.0,
  venusMass:          0.815,    venusRadius:     145,     venusSpeed:      1.0,
  earthMass:         20,        earthRadius:     200,     earthSpeed:      1.0,
  moonMass:           0.0123,   moonRadius:        1.5,   moonSpeed:       1.0,
  marsMass:           0.107,    marsRadius:      305,     marsSpeed:       1.0,
  jupiterMass:      317.8,      jupiterRadius:  1041,     jupiterSpeed:    1.0,
  saturnMass:        95.16,     saturnRadius:   1907,     saturnSpeed:     1.0,
  uranusMass:        14.54,     uranusRadius:   3838,     uranusSpeed:     1.0,
  neptuneMass:       17.15,     neptuneRadius:  6014,     neptuneSpeed:    1.0,
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

// Place each body at its initial position with the velocity that gives it a
// circular orbit in the *actual* gravitational field of the active bodies —
// not just the Sun-only approximation v = √(GM☉/r). This matters because
// the planets in this simulation have masses far larger than realistic
// solar-system ratios; a Sun-only formula leaves visible perturbations that
// turn into unbound orbits over time.
//
// `activeNames` is an optional Set of body names that should be active. When
// omitted, all bodies are active.
function buildBodies(p, activeNames = null) {
  function pos(radius, theta) {
    return { x: radius * Math.cos(theta), y: radius * Math.sin(theta) };
  }

  // Step 1: place every body at its starting position with zero velocity.
  const sun     = { name: 'Sun',     mass: p.sunMass, x: 0, y: 0, vx: 0, vy: 0 };
  const mercury = { name: 'Mercury', mass: p.mercuryMass, ...pos(p.mercuryRadius, START_ANGLES.Mercury), vx: 0, vy: 0 };
  const venus   = { name: 'Venus',   mass: p.venusMass,   ...pos(p.venusRadius,   START_ANGLES.Venus),   vx: 0, vy: 0 };
  const earth   = { name: 'Earth',   mass: p.earthMass,   ...pos(p.earthRadius,   START_ANGLES.Earth),   vx: 0, vy: 0 };
  const moon    = {
    name: 'Moon', mass: p.moonMass,
    x: earth.x + p.moonRadius * Math.cos(START_ANGLES.Earth),
    y: earth.y + p.moonRadius * Math.sin(START_ANGLES.Earth),
    vx: 0, vy: 0,
  };
  const mars    = { name: 'Mars',    mass: p.marsMass,    ...pos(p.marsRadius,    START_ANGLES.Mars),    vx: 0, vy: 0 };
  const jupiter = { name: 'Jupiter', mass: p.jupiterMass, ...pos(p.jupiterRadius, START_ANGLES.Jupiter), vx: 0, vy: 0 };
  const saturn  = { name: 'Saturn',  mass: p.saturnMass,  ...pos(p.saturnRadius,  START_ANGLES.Saturn),  vx: 0, vy: 0 };
  const uranus  = { name: 'Uranus',  mass: p.uranusMass,  ...pos(p.uranusRadius,  START_ANGLES.Uranus),  vx: 0, vy: 0 };
  const neptune = { name: 'Neptune', mass: p.neptuneMass, ...pos(p.neptuneRadius, START_ANGLES.Neptune), vx: 0, vy: 0 };

  const bodies = [sun, mercury, venus, earth, moon, mars, jupiter, saturn, uranus, neptune];
  for (const b of bodies) {
    b.active = activeNames ? activeNames.has(b.name) : true;
  }

  // Step 2: compute gravitational acceleration on each body using only the
  // currently-active set, so toggling a body off changes the perturbation
  // environment seen by the others.
  const activeBodies = bodies.filter(b => b.active);
  const acc          = accelerations(activeBodies);
  const accByName    = new Map();
  activeBodies.forEach((b, i) => accByName.set(b.name, acc[i]));

  const speedFactor = {
    Mercury: p.mercurySpeed, Venus:   p.venusSpeed,   Earth:   p.earthSpeed,   Moon:    p.moonSpeed,
    Mars:    p.marsSpeed,    Jupiter: p.jupiterSpeed, Saturn:  p.saturnSpeed,  Uranus:  p.uranusSpeed,
    Neptune: p.neptuneSpeed,
  };

  // Helper: set a body's velocity so it orbits CCW around `centerX, centerY`
  // with the speed that matches the inward acceleration `aInward` it feels.
  function setCircularV(b, centerX, centerY, aInward) {
    const dx = b.x - centerX, dy = b.y - centerY;
    const r  = Math.hypot(dx, dy);
    if (r < 1e-9) return;
    const rx = dx / r, ry = dy / r;
    const v  = aInward > 0 ? Math.sqrt(aInward * r) * (speedFactor[b.name] || 1) : 0;
    b.vx = -v * ry;
    b.vy =  v * rx;
  }

  // Step 3: planets orbit the Sun. Use the radial component of total
  // acceleration toward the origin.
  for (const b of [mercury, venus, earth, mars, jupiter, saturn, uranus, neptune]) {
    if (!b.active) continue;
    const a = accByName.get(b.name);
    if (!a) continue;
    const r  = Math.hypot(b.x, b.y);
    const aIn = -(a.x * (b.x / r) + a.y * (b.y / r));
    setCircularV(b, 0, 0, aIn);
  }

  // Moon: orbit Earth (or Sun if Earth is off). Use the *relative* radial
  // acceleration in Earth's accelerating frame so tidal effects from the Sun
  // are accounted for.
  if (moon.active) {
    if (earth.active) {
      const aM = accByName.get('Moon');
      const aE = accByName.get('Earth');
      if (aM && aE) {
        const dx = moon.x - earth.x, dy = moon.y - earth.y;
        const r  = Math.hypot(dx, dy);
        const rx = dx / r, ry = dy / r;
        const aIn = -((aM.x - aE.x) * rx + (aM.y - aE.y) * ry);
        setCircularV(moon, earth.x, earth.y, aIn);
        moon.vx += earth.vx;
        moon.vy += earth.vy;
      }
    } else {
      const a = accByName.get('Moon');
      if (a) {
        const r  = Math.hypot(moon.x, moon.y);
        const aIn = -(a.x * (moon.x / r) + a.y * (moon.y / r));
        setCircularV(moon, 0, 0, aIn);
      }
    }
  }

  // Step 4: zero net momentum across active bodies by adjusting the Sun's
  // velocity, so the centre of mass doesn't drift across the canvas.
  let pX = 0, pY = 0;
  for (const b of bodies) {
    if (!b.active) continue;
    pX += b.mass * b.vx;
    pY += b.mass * b.vy;
  }
  sun.vx = -pX / sun.mass;
  sun.vy = -pY / sun.mass;

  return bodies.map(b => ({ ...b, ...BODY_VISUAL[b.name], trail: [] }));
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
