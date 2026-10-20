// simulations/coriolis-carousel/physics.js
//
// A flat merry-go-round (angular velocity Ω, rotating about its centre) with
// a thrower (Ana) and catcher (Ben) standing on it. The ball, once thrown,
// feels no real horizontal force, so its ground/inertial-frame path is an
// exact straight line at constant speed — no integration needed. Everything
// else (the curved path seen from the platform, where Ben ends up, the miss
// distance) is obtained by exactly re-expressing that straight line in the
// rotating frame via a pure rotation, so there is no separate "rotating
// frame equation of motion" to get right or wrong.
//
// This mirrors the classroom thought experiment: "Ana throws a ball from the
// centre to Ben on the rim" (or Ben also on the rim) — see Session guide,
// §4 "The ball on the merry-go-round".

/** Rotate vector v by angle theta (radians), counter-clockwise for theta>0. */
function rotateVec(v, theta) {
  const c = Math.cos(theta), s = Math.sin(theta);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

function sub(a, b)   { return { x: a.x - b.x, y: a.y - b.y }; }
function add(a, b)   { return { x: a.x + b.x, y: a.y + b.y }; }
function scale(v, s) { return { x: v.x * s, y: v.y * s }; }
function mag(v)      { return Math.sqrt(v.x * v.x + v.y * v.y); }
function normalize(v) {
  const m = mag(v);
  return m < 1e-12 ? { x: 0, y: 0 } : { x: v.x / m, y: v.y / m };
}

/** Express a point fixed in the rotating frame, as seen from the ground, after the platform has turned by theta. */
function groundOfRotating(pRot, theta) { return rotateVec(pRot, theta); }

/** Express a ground-frame point in the platform's rotating frame, after it has turned by theta. */
function rotatingOfGround(pGround, theta) { return rotateVec(pGround, -theta); }

/**
 * Work out the aim direction and flight distance for a throw from Ana to Ben.
 *
 * 'naive': Ana throws straight at where Ben is right now (t=0) — the
 *          textbook setup that produces the classic miss.
 * 'lead' : Ana throws at where Ben will be once the ball arrives, estimated
 *          from the naive flight time (single first-order correction, the
 *          same approximation the session guide uses). This is exact when
 *          Ana is at the centre (every point on the rim is equidistant from
 *          her, so the lead doesn't change the flight time), and only
 *          approximate — small residual miss — when Ana is herself on the rim.
 *
 * @returns {{aimPoint, dir, distance}}
 */
function computeLaunch(anaPos, benPos, speed, omega, mode) {
  const naiveVec  = sub(benPos, anaPos);
  const naiveDist = mag(naiveVec);
  if (mode !== 'lead' || speed <= 0) {
    return { aimPoint: benPos, dir: normalize(naiveVec), distance: naiveDist };
  }
  const t0        = naiveDist / speed;
  const leadAngle = omega * t0;
  const aimPoint  = groundOfRotating(benPos, leadAngle);
  const vec       = sub(aimPoint, anaPos);
  return { aimPoint, dir: normalize(vec), distance: mag(vec) };
}

function flightDuration(distance, speed) { return speed > 0 ? distance / speed : Infinity; }

/** Ball position in the ground (inertial) frame at time t: straight line, constant velocity. */
function ballGroundPos(anaPos, dir, speed, t) {
  return add(anaPos, scale(dir, speed * t));
}

/** Position at time t, in the ground frame, of a point fixed on the rotating platform at angle omega*t. */
function platformPointGroundPos(pos0, omega, t) {
  return groundOfRotating(pos0, omega * t);
}

/** Ball position as seen from the platform (rotating frame) at time t. */
function ballRotatingPos(anaPos, dir, speed, omega, t) {
  const g = ballGroundPos(anaPos, dir, speed, t);
  return rotatingOfGround(g, omega * t);
}

/** Vector from Ben to the ball (so a positive component "ahead" means the ball overshot Ben's arc). */
function missVector(ballPos, benPos) { return sub(ballPos, benPos); }

/**
 * Ground-frame velocity of a point fixed on the platform at `pos`, carried
 * along by the rotation (Ω × r in 2D: a point at (x,y) moves at (-Ωy, Ωx)).
 * Zero at the centre, |Ω|·R at the rim — this is Ana's own velocity before
 * she even throws anything.
 */
function platformVelocity(pos, omega) { return { x: -omega * pos.y, y: omega * pos.x }; }

/**
 * Time at which a ball launched from `originPos` with constant ground-frame
 * velocity `vel` first reaches distance `radius` from the platform's centre
 * (solving |originPos + vel·t| = radius for the smallest t > 0). Used to find
 * when the ball reaches the rim Ben stands on, which works whether the ball
 * starts at the centre (distance 0) or already on the rim (distance R, as in
 * the edge-to-edge throw — in that case the t≈0 "root" is discarded).
 * Returns null if the ball never reaches that radius (shouldn't happen for
 * the throws this sim sets up, but guarded for safety).
 */
function circleInterceptTime(originPos, vel, radius) {
  const a = vel.x * vel.x + vel.y * vel.y;
  if (a < 1e-12) return null;
  const b = 2 * (originPos.x * vel.x + originPos.y * vel.y);
  const c = originPos.x * originPos.x + originPos.y * originPos.y - radius * radius;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sq = Math.sqrt(disc);
  const EPS = 1e-6;
  const roots = [(-b - sq) / (2 * a), (-b + sq) / (2 * a)].filter(t => t > EPS);
  return roots.length ? Math.min(...roots) : null;
}

if (typeof module !== 'undefined') {
  module.exports = {
    rotateVec, sub, add, scale, mag, normalize,
    groundOfRotating, rotatingOfGround,
    computeLaunch, flightDuration,
    ballGroundPos, platformPointGroundPos, ballRotatingPos,
    missVector, platformVelocity, circleInterceptTime,
  };
}
