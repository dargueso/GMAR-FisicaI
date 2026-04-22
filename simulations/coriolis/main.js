// simulations/coriolis/main.js

const CANVAS_SIZE  = 340;
const DISC_RADIUS  = 155;
const DISC_CX      = CANVAS_SIZE / 2;
const DISC_CY      = CANVAS_SIZE / 2;
const SCALE        = DISC_RADIUS / EQ_RADIUS;   // pixels per metre (EQ_RADIUS from physics.js)
const TIME_SCALE   = 3600;                       // 1 animation second = 1 real hour

// Default initial position: 45°N (NH) or 45°S (SH), lon = 0°
function defaultInitPos(hemisphere) {
  return latLonToMeters(hemisphere === 'NH' ? 45 : -45, 0, hemisphere);
}

// In our polar projection, longitude increases clockwise (NH) or counterclockwise (SH).
// Earth rotation angle (radians, positive = clockwise for NH, negative for SH).
function earthAngle(elapsedReal, omegaMult, hemisphere) {
  return (hemisphere === 'NH' ? 1 : -1) * OMEGA * omegaMult * elapsedReal;
}

// Convert rotating-frame position to inertial canvas position.
// The inertial position is R(θ_clockwise) × (x_rot, y_rot), which places the particle
// at the same geographic location on the rotating disc as on the fixed disc.
function rotatingToInertial(x, y, θ) {
  const c = Math.cos(θ), s = Math.sin(θ);
  return { x:  x * c + y * s,
           y: -x * s + y * c };
}

const state = {
  hemisphere:   'NH',
  omegaMult:    1.0,
  speed:        200,
  bearing:      90,

  rotating:     null,   // {x,y,vx,vy} — Earth-fixed (rotating) frame state
  ineState:     null,   // {x,y,vx,vy} — inertial position (computed from rotating + θ)
  initVelocity: null,   // {vx,vy} for deflection angle calculation
  initPos:      null,   // {x,y} metres — starting geographic position

  trailRot: [],         // canvas {px,py} — rotating frame trail (Coriolis curve)
  trailIne: [],         // canvas {px,py} — inertial trail (straight line)

  elapsedReal: 0,
  running:     false,
  rafId:       null,
  lastTime:    null,
};

function resetSim() {
  const pos = state.initPos || defaultInitPos(state.hemisphere);
  const vel = bearingToVelocity(state.bearing, state.speed);
  state.rotating     = { x: pos.x, y: pos.y, vx: vel.vx, vy: vel.vy };
  state.ineState     = { x: pos.x, y: pos.y, vx: vel.vx, vy: vel.vy };
  state.initVelocity = { vx: vel.vx, vy: vel.vy };
  state.trailRot     = [];
  state.trailIne     = [];
  state.elapsedReal  = 0;
  state.lastTime     = null;
  renderBoth();
}

function deflectionAngle(vx, vy, ivx, ivy) {
  const dot  = vx * ivx + vy * ivy;
  const magA = Math.sqrt(vx*vx + vy*vy);
  const magB = Math.sqrt(ivx*ivx + ivy*ivy);
  if (magA < 1e-10 || magB < 1e-10) return 0;
  return Math.acos(Math.max(-1, Math.min(1, dot / (magA * magB)))) * 180 / Math.PI;
}

function isOutsideDisc(x, y) {
  return Math.sqrt(x*x + y*y) > EQ_RADIUS * 0.98;
}

// discAngle: canvas rotation applied to the disc only (inertial panel uses Earth rotation).
// physState: position in the frame to display (rotating or inertial coords).
function renderFrame(ctx, physState, trail, showCoriolis, discAngle) {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  // Draw disc, optionally rotated (inertial frame shows Earth spinning)
  if (discAngle) {
    ctx.save();
    ctx.translate(DISC_CX, DISC_CY);
    ctx.rotate(discAngle);
    ctx.translate(-DISC_CX, -DISC_CY);
    drawDisc(ctx, DISC_CX, DISC_CY, DISC_RADIUS, state.hemisphere, SCALE);
    ctx.restore();
  } else {
    drawDisc(ctx, DISC_CX, DISC_CY, DISC_RADIUS, state.hemisphere, SCALE);
  }

  // Crosshair at starting geographic position (unrotated in both frames)
  if (state.initPos) {
    const initIne = discAngle
      ? rotatingToInertial(state.initPos.x, state.initPos.y, discAngle)
      : state.initPos;
    const c = metersToCanvas(initIne.x, initIne.y, DISC_CX, DISC_CY, SCALE);
    drawCrosshair(ctx, c.px, c.py);
  }

  drawTrail(ctx, trail);

  if (physState) {
    const { px, py } = metersToCanvas(physState.x, physState.y, DISC_CX, DISC_CY, SCALE);
    drawParticle(ctx, px, py, trail);

    const f = coriolisParam(physState.x, physState.y, state.omegaMult, state.hemisphere);
    drawAnnotations(ctx, px, py, physState.vx, physState.vy, f, showCoriolis);

    const speed = Math.sqrt(physState.vx**2 + physState.vy**2);
    const defl  = state.initVelocity
      ? deflectionAngle(physState.vx, physState.vy, state.initVelocity.vx, state.initVelocity.vy)
      : 0;
    drawInfoBox(ctx, CANVAS_SIZE, speed, defl, state.elapsedReal);
  }
}

function renderBoth() {
  const ctxRot = document.getElementById('canvas-rotating').getContext('2d');
  const ctxIne = document.getElementById('canvas-inertial').getContext('2d');
  const θ = earthAngle(state.elapsedReal, state.omegaMult, state.hemisphere);
  renderFrame(ctxRot, state.rotating,  state.trailRot, true,  0);
  renderFrame(ctxIne, state.ineState,  state.trailIne, false, θ);
}

function animate(timestamp) {
  if (!state.running) return;
  if (state.lastTime === null) state.lastTime = timestamp;
  const dtAnim = Math.min((timestamp - state.lastTime) / 1000, 0.05);  // cap at 50ms
  state.lastTime = timestamp;
  const dtReal = dtAnim * TIME_SCALE;

  if (isOutsideDisc(state.rotating.x, state.rotating.y)) {
    state.running = false;
    renderBoth();
    showBoundaryMessage();
    return;
  }

  // Advance rotating frame with Coriolis
  const f = coriolisParam(state.rotating.x, state.rotating.y, state.omegaMult, state.hemisphere);
  state.rotating = rk4Step(state.rotating, dtReal, f);
  state.elapsedReal += dtReal;

  // Derive inertial position: rotate the Earth-fixed position by the Earth rotation angle.
  // This places the particle at the same geographic location on the rotating disc.
  // Distance from pole is preserved (rotation is an isometry), so boundary is checked above.
  const θ = earthAngle(state.elapsedReal, state.omegaMult, state.hemisphere);
  const ine = rotatingToInertial(state.rotating.x, state.rotating.y, θ);

  // Inertial velocity: d/dt[R(θ)·r_rot] = Ω_perp(r_rot) + R(θ)·v_rot
  // The tangential component due to Earth rotation + the rotated launch velocity.
  const Ωz  = (state.hemisphere === 'NH' ? 1 : -1) * OMEGA * state.omegaMult;
  const c = Math.cos(θ), s = Math.sin(θ);
  const vx_ine =  state.rotating.vx * c + state.rotating.vy * s + Ωz *  ine.y;
  const vy_ine = -state.rotating.vx * s + state.rotating.vy * c - Ωz *  ine.x;
  state.ineState = { x: ine.x, y: ine.y, vx: vx_ine, vy: vy_ine };

  const cRot = metersToCanvas(state.rotating.x, state.rotating.y, DISC_CX, DISC_CY, SCALE);
  const cIne = metersToCanvas(ine.x, ine.y, DISC_CX, DISC_CY, SCALE);
  state.trailRot.push({ px: cRot.px, py: cRot.py });
  state.trailIne.push({ px: cIne.px, py: cIne.py });

  renderBoth();
  state.rafId = requestAnimationFrame(animate);
}

function showBoundaryMessage() {
  ['canvas-rotating', 'canvas-inertial'].forEach(id => {
    const ctx = document.getElementById(id).getContext('2d');
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, CANVAS_SIZE/2 - 22, CANVAS_SIZE, 44);
    ctx.fillStyle = '#e0e0e0';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Particle left hemisphere — press Reset', CANVAS_SIZE/2, CANVAS_SIZE/2 + 5);
    ctx.restore();
  });
}

function startSim() {
  if (state.running) return;
  if (!state.rotating) resetSim();
  state.running  = true;
  state.lastTime = null;
  state.rafId    = requestAnimationFrame(animate);
}

function pauseSim() {
  state.running = false;
  if (state.rafId) cancelAnimationFrame(state.rafId);
}

// Expose globals for controls.js
window.simState    = state;
window.startSim    = startSim;
window.pauseSim    = pauseSim;
window.resetSim    = resetSim;
window.renderBoth  = renderBoth;
window.DISC_CX     = DISC_CX;
window.DISC_CY     = DISC_CY;
window.DISC_RADIUS = DISC_RADIUS;
window.SCALE       = SCALE;

// Initial render when DOM is ready
window.addEventListener('load', () => {
  state.initPos = defaultInitPos(state.hemisphere);
  resetSim();
});
