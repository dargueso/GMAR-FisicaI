// simulations/coriolis3d/physics3d.js

const EARTH_RADIUS = 6_371_000; // metres

// --- Vector math (plain objects for Node.js testability) ---

function add3(a, b)    { return { x: a.x+b.x, y: a.y+b.y, z: a.z+b.z }; }
function sub3(a, b)    { return { x: a.x-b.x, y: a.y-b.y, z: a.z-b.z }; }
function scale3(v, s)  { return { x: v.x*s,   y: v.y*s,   z: v.z*s   }; }
function dot3(a, b)    { return a.x*b.x + a.y*b.y + a.z*b.z; }
function mag3(v)       { return Math.sqrt(dot3(v, v)); }
function norm3(v)      { return scale3(v, 1 / mag3(v)); }

function cross3(a, b) {
  return {
    x: a.y*b.z - a.z*b.y,
    y: a.z*b.x - a.x*b.z,
    z: a.x*b.y - a.y*b.x,
  };
}

// Remove radial component of v (project onto tangent plane at unit-sphere pos p)
function projectTangent(v, p) {
  const radial = dot3(v, p);
  return sub3(v, scale3(p, radial));
}

// Exact geodesic advance: rotate p by angle |vU|*h along direction vU on the unit sphere.
// Replaces the naive norm3(p + vU*h) which under-advances by arctan(δ) instead of δ,
// causing the orbit to be short of 2π and never close (error grows as dt²).
function geodesicMove(p, vU, h) {
  const s = mag3(vU);
  if (s < 1e-20) return { x: p.x, y: p.y, z: p.z };
  const delta = s * h;
  const c = Math.cos(delta), sc = Math.sin(delta) / s;
  return { x: p.x*c + vU.x*sc, y: p.y*c + vU.y*sc, z: p.z*c + vU.z*sc };
}

// Rotate vector around Y axis by angle theta (counterclockwise = NH Earth rotation)
function rotateY(v, theta) {
  const c = Math.cos(theta), s = Math.sin(theta);
  return { x: v.x*c + v.z*s, y: v.y, z: -v.x*s + v.z*c };
}

// lat/lon (degrees) → unit vector
function latLonToVec3(lat, lon) {
  const φ = lat * Math.PI / 180;
  const λ = lon * Math.PI / 180;
  return { x: Math.cos(φ)*Math.cos(λ), y: Math.sin(φ), z: -Math.cos(φ)*Math.sin(λ) };
}

// Unit vector → { lat, lon } in degrees
function vec3ToLatLon(v) {
  const r   = mag3(v);
  const lat = Math.asin(v.y / r) * 180 / Math.PI;
  const lon = Math.atan2(-v.z, v.x) * 180 / Math.PI;
  return { lat, lon };
}

// Convert compass bearing (deg, 0=N, 90=E) + speed (m/s) to 3D velocity at surface pos
function bearingSpeedToVel3D(pos, bearing, speed) {
  const up      = { x: 0, y: 1, z: 0 };
  // North tangent: project (0,1,0) onto tangent plane, normalise
  const northT  = norm3(projectTangent(up, pos));
  // East tangent: pos × northT (right-hand rule gives westward, negate for East)
  const eastT   = scale3(cross3(pos, northT), -1);
  const rad     = bearing * Math.PI / 180;
  return add3(scale3(eastT, speed * Math.sin(rad)), scale3(northT, speed * Math.cos(rad)));
}

// RK4 integration step on sphere surface.
// pos: unit vector (Earth-fixed)
// vel: m/s 3D velocity (tangent to sphere, Earth-fixed frame)
// omegaVec: {x,y,z} rad/s  (Earth rotation axis, e.g. {x:0, y:Ωz, z:0})
// dt: real seconds
// Returns: { pos, vel } — pos normalised to unit sphere, vel projected to tangent plane
function rk4Step3D(pos, vel, omegaVec, dt) {
  // Work in unit-sphere velocity units: vU = vel / EARTH_RADIUS (unit/s)
  const vU0 = scale3(vel, 1 / EARTH_RADIUS);

  function deriv(p, v) {
    const cor   = cross3(omegaVec, v);   // Ω × v
    const accel = scale3(cor, -2);       // Coriolis: -2Ω×v  (centrifugal omitted — on a sphere
                                         // it has a tangential equatorward component not cancelled
                                         // by gravity, causing unphysical drift and speed growth)
    return { dp: v, dv: projectTangent(accel, p) };
  }

  const k1 = deriv(pos, vU0);
  const p2 = geodesicMove(pos, k1.dp, dt/2);
  const v2 = add3(vU0, scale3(k1.dv, dt/2));
  const k2 = deriv(p2, v2);
  const p3 = geodesicMove(pos, k2.dp, dt/2);
  const v3 = add3(vU0, scale3(k2.dv, dt/2));
  const k3 = deriv(p3, v3);
  const p4 = geodesicMove(pos, k3.dp, dt);
  const v4 = add3(vU0, scale3(k3.dv, dt));
  const k4 = deriv(p4, v4);

  const avgVU = scale3(
    add3(add3(k1.dp, scale3(k2.dp, 2)), add3(scale3(k3.dp, 2), k4.dp)), 1/6);
  const newPos = geodesicMove(pos, avgVU, dt);
  const newVU  = add3(vU0, scale3(
    add3(add3(k1.dv, scale3(k2.dv, 2)), add3(scale3(k3.dv, 2), k4.dv)), dt/6));

  // Re-orthogonalise: project newVU onto the tangent plane at newPos, but preserve
  // the RK4-computed speed. Plain projectTangent would reduce |v| by cos(δ) per step
  // because newVU was tangent to the OLD position; over one orbit that accumulates a
  // shortfall of ~N·δ²/2 radians so the trajectory never closes.
  const tVel   = projectTangent(newVU, newPos);
  const newVel = scale3(norm3(tVel), mag3(newVU) * EARTH_RADIUS);
  return { pos: newPos, vel: newVel };
}

if (typeof module !== 'undefined') {
  module.exports = {
    EARTH_RADIUS,
    add3, sub3, scale3, dot3, mag3, norm3, cross3,
    projectTangent, rotateY, geodesicMove,
    latLonToVec3, vec3ToLatLon,
    bearingSpeedToVel3D,
    rk4Step3D,
  };
}
