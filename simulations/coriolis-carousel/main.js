// simulations/coriolis-carousel/main.js

const CANVAS_SIZE  = 320;
const DISC_RADIUS  = 140;           // px
const DISC_CX      = CANVAS_SIZE / 2;
const DISC_CY      = CANVAS_SIZE / 2;
const R            = 4;             // platform radius, metres (Session guide Problem 3)
const SCALE        = DISC_RADIUS / R;  // px per metre
const CATCH_RADIUS = 0.3;           // metres — "close enough" to count as caught
const STEP_DT       = 0.05;         // seconds advanced per frame-step click

const state = {
  mode:         'center',   // 'center' (Ana at centre) | 'edge' (Ana also on the rim)
  aimMode:      'naive',    // 'naive' (aim at Ben now) | 'lead' (aim where Ben will be)
  velocityMode: 'absolute', // 'absolute' (speed is Ana's throw, full stop) | 'relative' (Ana's own platform velocity is added on top)
  omega:     0.5,       // rad/s, +CCW / -CW
  speed:     5,         // m/s
  playback:  1,         // animation speed multiplier (slow-motion aid)
  showDiscTrail: false, // overlay the disc-fixed (rotating-frame) path on the ground view, spinning with the disc

  anaPos:    null,
  benPos:    null,
  launch:    null,      // { aimPoint, dir, distance }
  duration:  0,         // s

  t:         0,
  running:   false,
  result:    null,      // { hit, missDist, benPos, ballPos }
  trailGround: [],
  trailRot:    [],

  rafId:     null,
  lastTime:  null,
};

function positionsForMode(mode) {
  return mode === 'center'
    ? { ana: { x: 0, y: 0 }, ben: { x: 0, y: R } }
    : { ana: { x: 0, y: R }, ben: { x: 0, y: -R } };
}

function resetSim() {
  const { ana, ben } = positionsForMode(state.mode);
  state.anaPos = ana;
  state.benPos = ben;

  const launch  = computeLaunch(ana, ben, state.speed, state.omega, state.aimMode);
  const anaVel  = platformVelocity(ana, state.omega);
  const throwVel = scale(launch.dir, state.speed);
  const vel = state.velocityMode === 'relative' ? add(anaVel, throwVel) : throwVel;
  state.launch = { ...launch, vel, anaVel, throwVel };

  state.duration = circleInterceptTime(ana, vel, R) ?? flightDuration(launch.distance, state.speed);
  state.t = 0;
  state.result = null;
  state.trailGround = [];
  state.trailRot = [];
  state.lastTime = null;
  render();
}

function finishSim() {
  const ballPos = add(state.anaPos, scale(state.launch.vel, state.duration));
  const benPos  = platformPointGroundPos(state.benPos, state.omega, state.duration);
  const missDist = mag(missVector(ballPos, benPos));
  state.result = { hit: missDist < CATCH_RADIUS, missDist, ballPos, benPos };
  state.running = false;
}

function animate(timestamp) {
  if (!state.running) return;
  if (state.lastTime === null) state.lastTime = timestamp;
  const dtAnim = Math.min((timestamp - state.lastTime) / 1000, 0.05);
  state.lastTime = timestamp;
  state.t += dtAnim * state.playback;

  if (state.t >= state.duration) {
    state.t = state.duration;
    finishSim();
    pushTrailPoint();
    render();
    return;
  }

  pushTrailPoint();
  render();
  state.rafId = requestAnimationFrame(animate);
}

function pushTrailPoint() {
  const theta = state.omega * state.t;
  const ballG = add(state.anaPos, scale(state.launch.vel, state.t));
  const ballR = rotatingOfGround(ballG, theta);
  const cG = metersToCanvas(ballG.x, ballG.y, DISC_CX, DISC_CY, SCALE);
  const cR = metersToCanvas(ballR.x, ballR.y, DISC_CX, DISC_CY, SCALE);
  state.trailGround.push({ px: cG.px, py: cG.py });
  state.trailRot.push({ px: cR.px, py: cR.py });
}

function renderPanel(ctx, { rotateDisc, trail, color }) {
  const theta = state.omega * state.t;
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  if (rotateDisc) {
    ctx.save();
    ctx.translate(DISC_CX, DISC_CY);
    ctx.rotate(-theta); // canvas rotate() is screen-clockwise for +angle; negate for CCW-positive physics
    ctx.translate(-DISC_CX, -DISC_CY);
    drawDisc(ctx, DISC_CX, DISC_CY, DISC_RADIUS);
    // trailRot points are stored in the disc's own body frame, so drawing
    // them under this same rotation makes the path spin with the disc —
    // exactly like a line scratched onto the platform's surface.
    if (state.showDiscTrail) drawTrail(ctx, state.trailRot, '#f5d400', { dotted: true });
    ctx.restore();
  } else {
    drawDisc(ctx, DISC_CX, DISC_CY, DISC_RADIUS);
  }

  const anaPos = rotateDisc ? platformPointGroundPos(state.anaPos, state.omega, state.t) : state.anaPos;
  const benPos = rotateDisc ? platformPointGroundPos(state.benPos, state.omega, state.t) : state.benPos;
  const cAna = metersToCanvas(anaPos.x, anaPos.y, DISC_CX, DISC_CY, SCALE);
  const cBen = metersToCanvas(benPos.x, benPos.y, DISC_CX, DISC_CY, SCALE);

  if (rotateDisc && state.t === 0) {
    const cAim = metersToCanvas(state.launch.aimPoint.x, state.launch.aimPoint.y, DISC_CX, DISC_CY, SCALE);
    const cStart = metersToCanvas(state.anaPos.x, state.anaPos.y, DISC_CX, DISC_CY, SCALE);
    drawAimLine(ctx, cStart.px, cStart.py, cAim.px, cAim.py);
    drawVelocityVectors(
      ctx, cStart, state.launch.anaVel, state.launch.throwVel, state.launch.vel,
      state.velocityMode === 'relative'
    );
  }

  drawTrail(ctx, trail, color);
  drawPerson(ctx, cAna.px, cAna.py, '#4fd1ff', 'Ana');
  drawPerson(ctx, cBen.px, cBen.py, '#ffb84f', 'Ben');

  if (state.t > 0 || state.result) {
    const t = state.result ? state.duration : state.t;
    const ballGround = add(state.anaPos, scale(state.launch.vel, t));
    // rotateDisc=true is the ground panel (straight line); false is the
    // platform panel, where the same ball is re-expressed in rotating coords.
    const ballPhys = rotateDisc ? ballGround : rotatingOfGround(ballGround, state.omega * t);
    const cBall = metersToCanvas(ballPhys.x, ballPhys.y, DISC_CX, DISC_CY, SCALE);
    drawBall(ctx, cBall.px, cBall.py);
  }

  if (state.result && state.result.hit) {
    drawResultBanner(ctx, CANVAS_SIZE, CANVAS_SIZE, 'Caught!', true);
  }
}

function render() {
  const ctxRot = document.getElementById('canvas-rotating').getContext('2d');
  const ctxGround = document.getElementById('canvas-ground').getContext('2d');
  renderPanel(ctxRot,    { rotateDisc: false, trail: state.trailRot,    color: '#f0a500' });
  renderPanel(ctxGround, { rotateDisc: true,  trail: state.trailGround, color: '#4fd1ff' });
}

function startSim() {
  if (state.running) return;
  if (state.result) resetSim(); // start a fresh throw after a finished one
  state.running = true;
  state.lastTime = null;
  state.rafId = requestAnimationFrame(animate);
}

function pauseSim() {
  state.running = false;
  if (state.rafId) cancelAnimationFrame(state.rafId);
}

/** Advance exactly one fixed-size step (paused), for walking through the throw with a class. */
function stepSim() {
  pauseSim();
  if (!state.launch || state.result) return;
  state.t = Math.min(state.t + STEP_DT, state.duration);
  if (state.t >= state.duration) finishSim();
  pushTrailPoint();
  render();
}

window.simState  = state;
window.startSim  = startSim;
window.pauseSim  = pauseSim;
window.resetSim  = resetSim;
window.stepSim   = stepSim;

window.addEventListener('load', resetSim);
