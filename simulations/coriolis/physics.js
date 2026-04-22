// simulations/coriolis/physics.js

const EARTH_RADIUS = 6_371_000;      // metres
const OMEGA        = 7.2921e-5;      // rad/s
const EQ_RADIUS    = EARTH_RADIUS * Math.PI / 2;  // pole-to-equator arc in metres

/**
 * Coriolis parameter f at a given position.
 * @param {number} x  metres from pole, East
 * @param {number} y  metres from pole, "up on disc"
 * @param {number} omegaMult  rotation multiplier (1 = real Earth)
 * @param {string} hemisphere  'NH' or 'SH'
 * @returns {number} f in rad/s
 */
function coriolisParam(x, y, omegaMult, hemisphere) {
  const r = Math.sqrt(x * x + y * y);
  const angularDist = r / EARTH_RADIUS;          // radians from pole
  const f = 2 * OMEGA * omegaMult * Math.cos(angularDist);
  return hemisphere === 'NH' ? f : -f;
}

/**
 * Single RK4 integration step for the rotating frame.
 * Equations: dx/dt=vx, dy/dt=vy, dvx/dt=f*vy, dvy/dt=-f*vx
 * @param {{x,y,vx,vy}} state
 * @param {number} dt  seconds
 * @param {number} f   Coriolis parameter (constant over this step)
 * @returns {{x,y,vx,vy}}
 */
function rk4Step(state, dt, f) {
  function deriv(s) {
    return { x: s.vx, y: s.vy, vx: f * s.vy, vy: -f * s.vx };
  }
  function add(s, d, h) {
    return { x: s.x + d.x*h, y: s.y + d.y*h, vx: s.vx + d.vx*h, vy: s.vy + d.vy*h };
  }
  const k1 = deriv(state);
  const k2 = deriv(add(state, k1, dt/2));
  const k3 = deriv(add(state, k2, dt/2));
  const k4 = deriv(add(state, k3, dt));
  return {
    x:  state.x  + (dt/6) * (k1.x  + 2*k2.x  + 2*k3.x  + k4.x),
    y:  state.y  + (dt/6) * (k1.y  + 2*k2.y  + 2*k3.y  + k4.y),
    vx: state.vx + (dt/6) * (k1.vx + 2*k2.vx + 2*k3.vx + k4.vx),
    vy: state.vy + (dt/6) * (k1.vy + 2*k2.vy + 2*k3.vy + k4.vy),
  };
}

/**
 * Single step for the inertial (absolute) frame — no force, constant velocity.
 * @param {{x,y,vx,vy}} state
 * @param {number} dt  seconds
 * @returns {{x,y,vx,vy}}
 */
function straightStep(state, dt) {
  return { x: state.x + state.vx * dt, y: state.y + state.vy * dt, vx: state.vx, vy: state.vy };
}

/**
 * Convert geographic (lat, lon) to metres in disc coordinates.
 * NH: pole = (0,0), lon=0° is +y direction (top of disc).
 * SH: same formula, pole = South Pole.
 * @param {number} lat  degrees, positive North
 * @param {number} lon  degrees, East
 * @param {string} hemisphere 'NH' | 'SH'
 * @returns {{x: number, y: number}} metres
 */
function latLonToMeters(lat, lon, hemisphere) {
  const angularDist = hemisphere === 'NH'
    ? (90 - lat) * Math.PI / 180
    : (90 + lat) * Math.PI / 180;   // lat is negative in SH
  const r = EARTH_RADIUS * angularDist;
  const lonRad = lon * Math.PI / 180;
  return { x: r * Math.sin(lonRad), y: r * Math.cos(lonRad) };
}

/**
 * Convert bearing (compass degrees, 0=North/up, 90=East/right) and speed
 * to velocity components in disc coordinates.
 * @param {number} bearing  degrees
 * @param {number} speed    m/s
 * @returns {{vx: number, vy: number}}
 */
function bearingToVelocity(bearing, speed) {
  const rad = bearing * Math.PI / 180;
  return { vx: speed * Math.sin(rad), vy: speed * Math.cos(rad) };
}

if (typeof module !== 'undefined') {
  module.exports = { coriolisParam, rk4Step, straightStep, latLonToMeters, bearingToVelocity,
                     EARTH_RADIUS, OMEGA, EQ_RADIUS };
}
