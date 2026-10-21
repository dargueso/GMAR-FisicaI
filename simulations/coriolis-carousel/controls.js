// simulations/coriolis-carousel/controls.js

window.addEventListener('load', () => {

  // ── View mode (which panel(s) are shown) ─────────────────────────────────
  const btnViewGround   = document.getElementById('btn-view-ground');
  const btnViewPlatform = document.getElementById('btn-view-platform');
  const btnViewBoth     = document.getElementById('btn-view-both');
  const panelGround     = document.getElementById('panel-ground');
  const panelPlatform   = document.getElementById('panel-platform');
  function setViewMode(mode) {
    btnViewGround.classList.toggle('active', mode === 'ground');
    btnViewPlatform.classList.toggle('active', mode === 'platform');
    btnViewBoth.classList.toggle('active', mode === 'both');
    panelGround.hidden   = !(mode === 'ground' || mode === 'both');
    panelPlatform.hidden = !(mode === 'platform' || mode === 'both');
  }
  btnViewGround.addEventListener('click',   () => setViewMode('ground'));
  btnViewPlatform.addEventListener('click', () => setViewMode('platform'));
  btnViewBoth.addEventListener('click',     () => setViewMode('both'));

  // ── Throw mode ───────────────────────────────────────────────────────────
  const btnModeCenter = document.getElementById('btn-mode-center');
  const btnModeEdge    = document.getElementById('btn-mode-edge');
  function setMode(mode) {
    if (mode === simState.mode) return;
    simState.mode = mode;
    btnModeCenter.classList.toggle('active', mode === 'center');
    btnModeEdge.classList.toggle('active', mode === 'edge');
    pauseSim();
    resetSim();
  }
  btnModeCenter.addEventListener('click', () => setMode('center'));
  btnModeEdge.addEventListener('click',   () => setMode('edge'));

  // ── Aim mode ─────────────────────────────────────────────────────────────
  const btnAimNaive = document.getElementById('btn-aim-naive');
  const btnAimLead  = document.getElementById('btn-aim-lead');
  function setAimMode(mode) {
    if (mode === simState.aimMode) return;
    simState.aimMode = mode;
    btnAimNaive.classList.toggle('active', mode === 'naive');
    btnAimLead.classList.toggle('active',  mode === 'lead');
    pauseSim();
    resetSim();
  }
  btnAimNaive.addEventListener('click', () => setAimMode('naive'));
  btnAimLead.addEventListener('click',  () => setAimMode('lead'));

  // ── Velocity mode ────────────────────────────────────────────────────────
  const btnVelAbsolute = document.getElementById('btn-vel-absolute');
  const btnVelRelative = document.getElementById('btn-vel-relative');
  function setVelocityMode(mode) {
    if (mode === simState.velocityMode) return;
    simState.velocityMode = mode;
    btnVelAbsolute.classList.toggle('active', mode === 'absolute');
    btnVelRelative.classList.toggle('active', mode === 'relative');
    pauseSim();
    resetSim();
  }
  btnVelAbsolute.addEventListener('click', () => setVelocityMode('absolute'));
  btnVelRelative.addEventListener('click', () => setVelocityMode('relative'));

  // ── Rotation rate ────────────────────────────────────────────────────────
  const sliderOmega = document.getElementById('slider-omega');
  const valOmega    = document.getElementById('val-omega');
  function omegaLabel(v) {
    const dir = v > 0 ? ' (CCW)' : v < 0 ? ' (CW)' : '';
    return `${v.toFixed(2)} rad/s${dir}`;
  }
  sliderOmega.addEventListener('input', () => {
    simState.omega = parseFloat(sliderOmega.value);
    valOmega.textContent = omegaLabel(simState.omega);
    pauseSim();
    resetSim();
  });

  // ── Ball speed ───────────────────────────────────────────────────────────
  const sliderSpeed = document.getElementById('slider-speed');
  const valSpeed    = document.getElementById('val-speed');
  sliderSpeed.addEventListener('input', () => {
    simState.speed = parseFloat(sliderSpeed.value);
    valSpeed.textContent = `${simState.speed.toFixed(1)} m/s`;
    pauseSim();
    resetSim();
  });

  // ── Playback speed (slow motion aid) ────────────────────────────────────
  const playbackBtns = [0.25, 0.5, 1].map(m => ({
    mult: m, el: document.getElementById(`btn-playback-${String(m).replace('.', '')}`),
  }));
  playbackBtns.forEach(({ mult, el }) => {
    el.addEventListener('click', () => {
      simState.playback = mult;
      playbackBtns.forEach(b => b.el.classList.remove('active'));
      el.classList.add('active');
    });
  });

  // ── Disc-fixed path overlay ──────────────────────────────────────────────
  const btnDiscTrail = document.getElementById('btn-disc-trail');
  btnDiscTrail.addEventListener('click', () => {
    simState.showDiscTrail = !simState.showDiscTrail;
    btnDiscTrail.classList.toggle('active', simState.showDiscTrail);
    render();
  });

  // ── Play / Pause / Step / Reset ──────────────────────────────────────────
  document.getElementById('btn-play').addEventListener('click', startSim);
  document.getElementById('btn-pause').addEventListener('click', pauseSim);
  document.getElementById('btn-step').addEventListener('click', stepSim);
  document.getElementById('btn-reset').addEventListener('click', () => { pauseSim(); resetSim(); });

  // ── Keyboard shortcuts: ←/→ step back/forward one frame, Space play/pause ──
  window.addEventListener('keydown', (e) => {
    // Let a focused slider keep its native arrow-key behaviour.
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

    if (e.code === 'ArrowRight') {
      e.preventDefault();
      stepSim();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      stepBack();
    } else if (e.code === 'Space') {
      e.preventDefault();
      simState.running ? pauseSim() : startSim();
    }
  });

});
