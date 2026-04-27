// simulations/coriolis3d/controls3d.js

window.addEventListener('load', () => {

  // ── Frame mode buttons ────────────────────────────────────────────────────
  const btnFrameFixed  = document.getElementById('btn-frame-fixed');
  const btnFrameEarth  = document.getElementById('btn-frame-earth');
  const btnFrameFollow = document.getElementById('btn-frame-follow');

  function setFrameMode(mode) {
    if (mode === state3D.frameMode) return;
    const prevMode = state3D.frameMode;
    const θ        = earthAngle3D();
    const orbit    = getOrbit();

    if (prevMode === 'follow') {
      // Leaving Follow: lock current camera world direction into absolute orbit angles.
      const cam = getCamera();
      const r   = cam.position.length();
      orbit.theta    = Math.atan2(cam.position.x / r, cam.position.z / r);
      orbit.phi      = Math.asin(Math.max(-1, Math.min(1, cam.position.y / r)));
      orbit.thetaOff = 0;
      orbit.phiOff   = 0;
      // Camera is now expressed in Fixed-frame coords; compensate if heading to Earth.
      if (mode === 'earth') orbit.theta -= θ;
    } else if (mode === 'follow') {
      // Entering Follow: reset offsets so the camera starts directly above the
      // particle, and reseed the local frame so camera.up = geographic north.
      orbit.thetaOff = 0;
      orbit.phiOff   = 0;
      const p = state3D.pos || state3D.initPos;
      if (p) seedFollowFrame(orbit, p);
    } else {
      // Fixed ↔ Earth: adjust theta to keep the same surface longitude in view.
      orbit.theta += (mode === 'earth') ? -θ : +θ;
    }

    state3D.frameMode = mode;
    btnFrameFixed.classList.toggle('active',  mode === 'fixed');
    btnFrameEarth.classList.toggle('active',  mode === 'earth');
    btnFrameFollow.classList.toggle('active', mode === 'follow');
    renderFrame3D();
  }

  btnFrameFixed.addEventListener('click',  () => setFrameMode('fixed'));
  btnFrameEarth.addEventListener('click',  () => setFrameMode('earth'));
  btnFrameFollow.addEventListener('click', () => setFrameMode('follow'));

  // ── Trail mode buttons ────────────────────────────────────────────────────
  const btnTrailSpace = document.getElementById('btn-trail-space');
  const btnTrailEarth = document.getElementById('btn-trail-earth');

  function setTrailMode(mode) {
    state3D.trailMode = mode;
    btnTrailSpace.classList.toggle('active', mode === 'space');
    btnTrailEarth.classList.toggle('active', mode === 'earth');
    renderFrame3D();
  }

  btnTrailSpace.addEventListener('click', () => setTrailMode('space'));
  btnTrailEarth.addEventListener('click', () => setTrailMode('earth'));

  // ── Arrow toggles (independent on/off) ────────────────────────────────────
  function bindArrowToggle(btnId, stateKey) {
    const btn = document.getElementById(btnId);
    btn.addEventListener('click', () => {
      state3D[stateKey] = !state3D[stateKey];
      btn.classList.toggle('active', state3D[stateKey]);
      renderFrame3D();
    });
  }
  bindArrowToggle('btn-arrow-vel-abs',   'showVelAbs');
  bindArrowToggle('btn-arrow-vel-earth', 'showVelEarth');
  bindArrowToggle('btn-arrow-cor',       'showCoriolis');

  // ── Period slider ─────────────────────────────────────────────────────────
  const sliderPeriod  = document.getElementById('slider-period');
  const valPeriod     = document.getElementById('val-period');
  const btnNoRotation = document.getElementById('btn-no-rotation');

  sliderPeriod.addEventListener('input', () => {
    const v = parseFloat(sliderPeriod.value);
    state3D.periodH = v;
    valPeriod.textContent = `${v.toFixed(2)} h`;
    renderFrame3D();
  });

  btnNoRotation.addEventListener('click', () => {
    state3D.noRotation = !state3D.noRotation;
    btnNoRotation.classList.toggle('active', state3D.noRotation);
    sliderPeriod.disabled = state3D.noRotation;
    valPeriod.textContent = state3D.noRotation ? 'No rotation' : `${state3D.periodH.toFixed(2)} h`;
    renderFrame3D();
  });

  // Update vel for arrow display while paused.
  function applyBearingSpeed() {
    if (!state3D.pos) return;
    state3D.vel = { ...bearingSpeedToVel3D(state3D.pos, state3D.bearing, state3D.speed) };
  }

  // ── Speed slider ──────────────────────────────────────────────────────────
  const sliderSpeed = document.getElementById('slider-speed');
  const valSpeed    = document.getElementById('val-speed');
  sliderSpeed.addEventListener('input', () => {
    const v = parseInt(sliderSpeed.value, 10);
    state3D.speed = v;
    valSpeed.textContent = `${v} m/s`;
    applyBearingSpeed();
    renderFrame3D();
  });

  // ── Bearing slider ────────────────────────────────────────────────────────
  const BEARING_LABELS = {0:'N',45:'NE',90:'E',135:'SE',180:'S',225:'SW',270:'W',315:'NW',360:'N'};
  const sliderBearing = document.getElementById('slider-bearing');
  const valBearing    = document.getElementById('val-bearing');
  sliderBearing.addEventListener('input', () => {
    const v = parseInt(sliderBearing.value, 10);
    state3D.bearing = v;
    const label = BEARING_LABELS[v] ? ` (${BEARING_LABELS[v]})` : '';
    valBearing.textContent = `${v}°${label}`;
    applyBearingSpeed();
    renderFrame3D();
  });

  // ── Sim speed buttons ─────────────────────────────────────────────────────
  const simSpeedBtns = [1, 2, 5, 10].map(m => ({
    mult: m, el: document.getElementById(`btn-simspeed-${m}`),
  }));
  simSpeedBtns.forEach(({ mult, el }) => {
    el.addEventListener('click', () => {
      state3D.timeScale = mult;
      simSpeedBtns.forEach(b => b.el.classList.remove('active'));
      el.classList.add('active');
    });
  });

  // ── Play / Pause / Reset ──────────────────────────────────────────────────
  document.getElementById('btn-play').addEventListener('click', startSim3D);
  document.getElementById('btn-pause').addEventListener('click', pauseSim3D);
  document.getElementById('btn-reset').addEventListener('click', () => {
    pauseSim3D();
    resetSim3D();
  });

  // ── Click-to-place (raycasting) ───────────────────────────────────────────
  const canvas    = document.getElementById('canvas3d');
  const raycaster = new THREE.Raycaster();
  const mouse     = new THREE.Vector2();

  canvas.addEventListener('click', (e) => {
    const orbit = getOrbit();
    if (orbit.didDrag) return;

    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width)  *  2 - 1;
    mouse.y = ((e.clientY - rect.top)  / rect.height) * -2 + 1;

    raycaster.setFromCamera(mouse, getCamera());
    const hits = raycaster.intersectObject(getEarthMesh());
    if (hits.length === 0) return;

    // Un-rotate the hit point by earthAngle to get the Earth-fixed geographic position.
    const worldPt = hits[0].point;
    const earthPt = worldPt.clone().applyEuler(
      new THREE.Euler(0, -getEarthGroup().rotation.y, 0)
    ).normalize();

    state3D.initPos = { x: earthPt.x, y: earthPt.y, z: earthPt.z };
    pauseSim3D();
    resetSim3D();
  });

});
