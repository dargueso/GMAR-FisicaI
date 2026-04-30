// simulations/angular-momentum/physics.js
//
// Pure math helpers + a tiny shared PhysicsState. No DOM access.

// ── Vector / scalar helpers ─────────────────────────────────────────────────

function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
function deg2rad(d)       { return d * Math.PI / 180; }
function rad2deg(r)       { return r * 180 / Math.PI; }

// ── Moment of inertia for the shape templates used in module 2 ─────────────
//
// All formulas assume rotation about a diameter / centre axis.
//   solid disc       I = ½ m r²
//   hollow ring      I = m r²
//   point mass       I = m r²        (single point on rim)
//   thin rod         I = ⅓ m r²      (length 2r, through centre)
//   solid sphere     I = ⅖ m r²
//   hollow sphere    I = ⅔ m r²      (thin spherical shell)

const SHAPE_FACTORS = {
  disc:    0.5,
  ring:    1.0,
  point:   1.0,
  rod:     1 / 3,
  sphere:  2 / 5,
  shell:   2 / 3,
};

const SHAPE_LABELS = {
  disc:    'Solid disc',
  ring:    'Hollow ring',
  point:   'Point mass at rim',
  rod:     'Uniform rod',
  sphere:  'Solid sphere',
  shell:   'Hollow sphere',
};

function inertiaOf(shape, mass, radius) {
  const k = SHAPE_FACTORS[shape] ?? 1;
  return k * mass * radius * radius;
}

// ── Shared state registry ───────────────────────────────────────────────────
//
// Each module writes its current readouts here so other modules (and the
// info-box) can read them. The integrated scenario uses its own substate;
// modules 1–3 each own a namespaced sub-object.

const PhysicsState = {
  module1: { m: 5,  r: 2,    omega: 2,   I: 0,  L: 0 },
  module2: { mass: 5, radius: 2, torque: 2, shapeA: 'disc', shapeB: 'ring',
             omegaA: 0, omegaB: 0, IA: 0, IB: 0, alphaA: 0, alphaB: 0 },
  module3: { r: 2, F: 5, theta: 90, tau: 0 },
  module4: { mass: 5, radius: 3, tau: 2, I: 0, L: 0, omega: 0, t: 0 },
};

// ── Module 1 helpers ────────────────────────────────────────────────────────
// Treat the rotating ring as a thin hoop: I = m r².
// Conserving L: ω_new = L / (m r_new²).

function ringInertia(m, r) { return m * r * r; }

function omegaForConservedL(L, m, r) {
  const I = ringInertia(m, r);
  return I > 1e-12 ? L / I : 0;
}

// ── Module 3 helpers ────────────────────────────────────────────────────────

function torqueFromRFTheta(r, F, thetaRad) {
  return r * F * Math.sin(thetaRad);
}

// ── Node export (for unit tests in tests/) ──────────────────────────────────

if (typeof module !== 'undefined') {
  module.exports = {
    clamp, deg2rad, rad2deg,
    SHAPE_FACTORS, SHAPE_LABELS, inertiaOf,
    ringInertia, omegaForConservedL,
    torqueFromRFTheta,
    PhysicsState,
  };
}
