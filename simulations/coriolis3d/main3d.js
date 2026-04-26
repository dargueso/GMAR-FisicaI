// simulations/coriolis3d/main3d.js

const TIME_SCALE_3D = 3600; // 1 animation second = 1 real hour
const TRAIL_MAX_3D  = 8000; // must match TRAIL_MAX in scene3d.js

const DEFAULT_LAT = 45, DEFAULT_LON = 0;

const state3D = {
  periodH:     23.93,
  noRotation:  false,
  speed:       200,
  bearing:     0,
  timeScale:   1,
  frameMode:   'fixed',  // 'fixed' | 'earth' | 'follow'
  trailMode:   'space',  // 'space' | 'earth'
  pos:         null,   // inertial world unit vector
  vel:         null,   // m/s — inertial frame
  initPos:     null,   // Earth-fixed unit vector at t=0 (= inertial at t=0)
  elapsedReal: 0,
  trail:       [],     // inertial world positions
  trailEF:     [],     // Earth-fixed positions (for Earth surface trail)
  running:     false,
  rafId:       null,
  lastTime:    null,
};

let g_renderer, g_scene, g_camera, g_earthGroup, g_earthMesh;
let g_partMesh, g_partGlow, g_trailLine, g_trailBuf;
let g_velArrow, g_corArrow, g_crosshairLine, g_orbit;

function getOmegaVec() {
  if (state3D.noRotation) return { x: 0, y: 0, z: 0 };
  const Ωz = 2 * Math.PI / (state3D.periodH * 3600);
  return { x: 0, y: Ωz, z: 0 };
}

function earthAngle3D() {
  if (state3D.noRotation) return 0;
  return (2 * Math.PI * state3D.elapsedReal) / (state3D.periodH * 3600);
}

function resetSim3D() {
  const pos = state3D.initPos || latLonToVec3(DEFAULT_LAT, DEFAULT_LON);
  state3D.pos         = { ...pos };
  state3D.vel         = { ...bearingSpeedToVel3D(pos, state3D.bearing, state3D.speed) };
  state3D.initPos     = { ...pos };
  state3D.trail       = [];
  state3D.trailEF     = [];
  state3D.elapsedReal = 0;
  state3D.lastTime    = null;
  resetOrbit(g_orbit, pos);
  renderFrame3D();
}

function renderFrame3D() {
  const θ = earthAngle3D();
  const earthFrame = (state3D.frameMode === 'earth');

  // In Earth frame Earth stays still; particle shown at its Earth-fixed position.
  g_earthGroup.rotation.y = earthFrame ? 0 : θ;
  const wp = earthFrame ? rotateY(state3D.pos, -θ) : state3D.pos;
  const wv = earthFrame ? rotateY(state3D.vel, -θ) : state3D.vel;

  updateParticle(g_partMesh, g_partGlow, wp);
  updateCrosshair(g_crosshairLine, state3D.initPos, earthFrame ? 0 : θ);
  updateTrail(g_trailLine, g_trailBuf, state3D.trail, state3D.trailEF, state3D.trailMode, θ, earthFrame);
  updateArrow(g_velArrow, wp, wv, g_camera);
  updateCorArrow(g_corArrow, wp, wv, getOmegaVec(), θ, earthFrame, g_camera);
  updateCamera(g_camera, g_orbit, state3D.frameMode, wp);
  g_renderer.render(g_scene, g_camera);
  updateInfoBox3D();
}

function updateInfoBox3D() {
  const θ = earthAngle3D();
  const efPos = rotateY(state3D.pos, -θ);
  const { lat, lon } = vec3ToLatLon(efPos);
  const latStr = `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;
  document.getElementById('info-latlon').textContent  = `Lat: ${latStr}  Lon: ${lonStr}`;
  document.getElementById('info-time').textContent    = `Time:   ${(state3D.elapsedReal / 3600).toFixed(2)} h`;
  document.getElementById('info-period').textContent  = state3D.noRotation ? 'Period: No rotation' : `Period: ${state3D.periodH.toFixed(2)} h`;
  document.getElementById('info-speed').textContent   = `Speed:  ${mag3(state3D.vel).toFixed(0)} m/s`;
}

function animate3D(timestamp) {
  if (!state3D.running) return;
  if (state3D.lastTime === null) state3D.lastTime = timestamp;
  const dtAnim = Math.min((timestamp - state3D.lastTime) / 1000, 0.05);
  state3D.lastTime = timestamp;
  const dtReal = dtAnim * TIME_SCALE_3D * state3D.timeScale;

  // Free geodesic on sphere — no forces in inertial frame
  const spd = mag3(state3D.vel);
  if (spd > 1e-10) {
    const vU    = scale3(state3D.vel, 1 / EARTH_RADIUS);
    const delta = spd * dtReal / EARTH_RADIUS;
    const cosD  = Math.cos(delta), sinD = Math.sin(delta);
    const oldPos = state3D.pos;
    state3D.pos = geodesicMove(oldPos, vU, dtReal);
    state3D.vel = {
      x: state3D.vel.x * cosD - oldPos.x * spd * sinD,
      y: state3D.vel.y * cosD - oldPos.y * spd * sinD,
      z: state3D.vel.z * cosD - oldPos.z * spd * sinD,
    };
  }

  state3D.elapsedReal += dtReal;

  if (state3D.trail.length >= TRAIL_MAX_3D) {
    state3D.trail.shift();
    state3D.trailEF.shift();
  }
  state3D.trail.push({ x: state3D.pos.x, y: state3D.pos.y, z: state3D.pos.z });
  const efPos = rotateY(state3D.pos, -earthAngle3D());
  state3D.trailEF.push({ x: efPos.x, y: efPos.y, z: efPos.z });

  renderFrame3D();
  state3D.rafId = requestAnimationFrame(animate3D);
}

function startSim3D() {
  if (state3D.running) return;
  if (!state3D.pos) resetSim3D();
  state3D.running  = true;
  state3D.lastTime = null;
  state3D.rafId    = requestAnimationFrame(animate3D);
}

function pauseSim3D() {
  state3D.running = false;
  if (state3D.rafId) cancelAnimationFrame(state3D.rafId);
}

function initAll3D() {
  const canvas = document.getElementById('canvas3d');
  const sceneData = initScene(canvas);
  g_renderer   = sceneData.renderer;
  g_scene      = sceneData.scene;
  g_camera     = sceneData.camera;
  g_earthGroup = sceneData.earthGroup;
  g_earthMesh  = sceneData.earthMesh;

  const { partMesh, partGlow } = buildParticle(g_scene);
  g_partMesh = partMesh;
  g_partGlow = partGlow;

  const { trailLine, trailBuf } = buildTrail(g_scene);
  g_trailLine = trailLine;
  g_trailBuf  = trailBuf;

  g_velArrow      = buildArrow(g_scene, 0xffffff);
  g_corArrow      = buildArrow(g_scene, 0xff4444);
  g_crosshairLine = buildCrosshair(g_scene);

  state3D.initPos = { ...latLonToVec3(DEFAULT_LAT, DEFAULT_LON) };
  g_orbit = initOrbit(canvas);
  resetSim3D();
}

window.state3D       = state3D;
window.startSim3D    = startSim3D;
window.pauseSim3D    = pauseSim3D;
window.resetSim3D    = resetSim3D;
window.renderFrame3D = renderFrame3D;
window.earthAngle3D  = earthAngle3D;
window.getOrbit      = () => g_orbit;
window.getEarthGroup = () => g_earthGroup;
window.getEarthMesh  = () => g_earthMesh;
window.getCamera     = () => g_camera;

window.addEventListener('load', initAll3D);
