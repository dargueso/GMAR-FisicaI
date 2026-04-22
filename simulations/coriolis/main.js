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

const state = {
  hemisphere: 'NH',
  omegaMult: 1.0,
  speed: 200,
  bearing: 90,

  rotating:     null,   // {x,y,vx,vy} — rotating frame state
  inertial:     null,   // {x,y,vx,vy} — inertial frame state
  initVelocity: null,   // {vx,vy} — initial velocity for deflection calc
  initPos:      null,   // {x,y} — initial position (metres)

  trailRot: [],         // canvas {px,py} points for rotating trail
  trailIne: [],         // canvas {px,py} points for inertial trail

  elapsedReal: 0,       // accumulated real seconds
  running: false,
  rafId: null,
  lastTime: null,       // rAF timestamp of previous frame
};

function resetSim() {
  const pos = state.initPos || defaultInitPos(state.hemisphere);
  const vel = bearingToVelocity(state.bearing, state.speed);
  state.rotating     = { x: pos.x, y: pos.y, vx: vel.vx, vy: vel.vy };
  state.inertial     = { x: pos.x, y: pos.y, vx: vel.vx, vy: vel.vy };
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

function renderFrame(ctx, physState, trail, showCoriolis) {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  drawDisc(ctx, DISC_CX, DISC_CY, DISC_RADIUS, state.hemisphere, SCALE);

  if (state.initPos) {
    const c = metersToCanvas(state.initPos.x, state.initPos.y, DISC_CX, DISC_CY, SCALE);
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
  renderFrame(ctxRot, state.rotating, state.trailRot, true,  0);
  renderFrame(ctxIne, state.inertial, state.trailIne, false, 0);
}

function animate(timestamp) {
  if (!state.running) return;
  if (state.lastTime === null) state.lastTime = timestamp;
  const dtAnim = Math.min((timestamp - state.lastTime) / 1000, 0.05);  // cap at 50ms
  state.lastTime = timestamp;
  const dtReal = dtAnim * TIME_SCALE;

  if (isOutsideDisc(state.rotating.x, state.rotating.y) ||
      isOutsideDisc(state.inertial.x,  state.inertial.y)) {
    state.running = false;
    renderBoth();
    showBoundaryMessage();
    return;
  }

  const f = coriolisParam(state.rotating.x, state.rotating.y, state.omegaMult, state.hemisphere);
  state.rotating = rk4Step(state.rotating, dtReal, f);
  state.inertial  = straightStep(state.inertial, dtReal);
  state.elapsedReal += dtReal;

  const cRot = metersToCanvas(state.rotating.x, state.rotating.y, DISC_CX, DISC_CY, SCALE);
  const cIne = metersToCanvas(state.inertial.x,  state.inertial.y,  DISC_CX, DISC_CY, SCALE);
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
