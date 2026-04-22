// simulations/coriolis/controls.js

window.addEventListener('load', () => {

  // ── Hemisphere toggle ──────────────────────────────────────────────────────
  document.getElementById('btn-nh').addEventListener('click', () => {
    simState.hemisphere = 'NH';
    document.getElementById('btn-nh').classList.add('active');
    document.getElementById('btn-sh').classList.remove('active');
    simState.initPos = null;
    pauseSim();
    resetSim();
  });
  document.getElementById('btn-sh').addEventListener('click', () => {
    simState.hemisphere = 'SH';
    document.getElementById('btn-sh').classList.add('active');
    document.getElementById('btn-nh').classList.remove('active');
    simState.initPos = null;
    pauseSim();
    resetSim();
  });

  // ── Rotation rate slider ───────────────────────────────────────────────────
  const sliderOmega = document.getElementById('slider-omega');
  const valOmega    = document.getElementById('val-omega');
  sliderOmega.addEventListener('input', () => {
    const v = parseFloat(sliderOmega.value);
    simState.omegaMult = v;
    valOmega.textContent = `${v.toFixed(1)} × Ω`;
    pauseSim();
    resetSim();
  });

  // ── Speed slider ───────────────────────────────────────────────────────────
  const sliderSpeed = document.getElementById('slider-speed');
  const valSpeed    = document.getElementById('val-speed');
  sliderSpeed.addEventListener('input', () => {
    const v = parseInt(sliderSpeed.value, 10);
    simState.speed = v;
    valSpeed.textContent = `${v} m/s`;
    pauseSim();
    resetSim();
  });

  // ── Bearing slider ─────────────────────────────────────────────────────────
  const BEARING_LABELS = { 0:'N', 45:'NE', 90:'E', 135:'SE', 180:'S', 225:'SW', 270:'W', 315:'NW', 360:'N' };
  const sliderBearing = document.getElementById('slider-bearing');
  const valBearing    = document.getElementById('val-bearing');
  sliderBearing.addEventListener('input', () => {
    const v = parseInt(sliderBearing.value, 10);
    simState.bearing = v;
    const label = BEARING_LABELS[v] ? ` (${BEARING_LABELS[v]})` : '';
    valBearing.textContent = `${v}°${label}`;
    pauseSim();
    resetSim();
  });

  // ── Play / Pause / Reset ───────────────────────────────────────────────────
  document.getElementById('btn-play').addEventListener('click', startSim);
  document.getElementById('btn-pause').addEventListener('click', pauseSim);
  document.getElementById('btn-reset').addEventListener('click', () => {
    pauseSim();
    resetSim();
  });

  // ── Click-to-place on either canvas ───────────────────────────────────────
  ['canvas-rotating', 'canvas-inertial'].forEach(id => {
    document.getElementById(id).addEventListener('click', e => {
      const rect   = e.target.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const dx = clickX - DISC_CX;
      const dy = clickY - DISC_CY;
      if (Math.sqrt(dx * dx + dy * dy) > DISC_RADIUS) return;
      simState.initPos = {
        x:  dx / SCALE,
        y: -dy / SCALE,   // flip canvas y → physics y
      };
      pauseSim();
      resetSim();
    });
  });

});
