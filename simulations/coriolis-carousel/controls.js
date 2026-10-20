// simulations/coriolis-carousel/controls.js

window.addEventListener('load', () => {

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

});
