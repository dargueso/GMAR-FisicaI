// tests/coriolis/physics.test.js
const assert = require('assert');

const {
  coriolisParam,
  rk4Step,
  straightStep,
  latLonToMeters,
} = require('../../simulations/coriolis/physics.js');

const R = 6_371_000;
const OMEGA = 7.2921e-5;
const EQ_RADIUS = R * Math.PI / 2;

// coriolisParam: at pole (r=0), f = ±2Ω×mult
{
  const f = coriolisParam(0, 0, 1.0, 'NH');
  assert.ok(Math.abs(f - 2 * OMEGA) < 1e-10, `NH pole: expected ${2*OMEGA}, got ${f}`);
}
{
  const f = coriolisParam(0, 0, 1.0, 'SH');
  assert.ok(Math.abs(f + 2 * OMEGA) < 1e-10, `SH pole: expected ${-2*OMEGA}, got ${f}`);
}
// At equator (r = EQ_RADIUS), f = 0
{
  const f = coriolisParam(EQ_RADIUS, 0, 1.0, 'NH');
  assert.ok(Math.abs(f) < 1e-10, `equator: expected 0, got ${f}`);
}

// rk4Step with f=0: particle moves in straight line
{
  const state = { x: 0, y: 0, vx: 100, vy: 0 };
  const dt = 60;
  const next = rk4Step(state, dt, 0);
  assert.ok(Math.abs(next.x - 6000) < 1e-6, `straight x: expected 6000, got ${next.x}`);
  assert.ok(Math.abs(next.y) < 1e-10, `straight y: expected 0, got ${next.y}`);
  assert.ok(Math.abs(next.vx - 100) < 1e-10, `straight vx: expected 100, got ${next.vx}`);
}

// rk4Step with f>0 (NH): east-moving particle deflects south (negative vy after dt)
{
  const state = { x: 0, y: 0, vx: 500, vy: 0 };
  const dt = 3600; // 1 hour
  const f = 2 * OMEGA;
  const next = rk4Step(state, dt, f);
  assert.ok(next.vy < 0, `NH deflection: vy should be negative, got ${next.vy}`);
}

// straightStep: constant velocity, no force
{
  const state = { x: 100, y: 200, vx: 10, vy: -5 };
  const dt = 10;
  const next = straightStep(state, dt);
  assert.ok(Math.abs(next.x - 200) < 1e-10, `straight x`);
  assert.ok(Math.abs(next.y - 150) < 1e-10, `straight y`);
  assert.ok(Math.abs(next.vx - 10) < 1e-10, `straight vx`);
  assert.ok(Math.abs(next.vy - (-5)) < 1e-10, `straight vy`);
}

// latLonToMeters: (lat=90, lon=0) → (0, 0) — North Pole is origin
{
  const { x, y } = latLonToMeters(90, 0, 'NH');
  assert.ok(Math.abs(x) < 1, `pole x`);
  assert.ok(Math.abs(y) < 1, `pole y`);
}
// (lat=0, lon=0) → (0, EQ_RADIUS) — equator at lon=0 is top of disc
{
  const { x, y } = latLonToMeters(0, 0, 'NH');
  assert.ok(Math.abs(x) < 1, `equator lon=0 x`);
  assert.ok(Math.abs(y - EQ_RADIUS) < 10, `equator lon=0 y: expected ${EQ_RADIUS}, got ${y}`);
}

// bearingToVelocity: 0°(N)→(0,speed), 90°(E)→(speed,0)
{
  const { bearingToVelocity } = require('../../simulations/coriolis/physics.js');
  const { vx: vx0, vy: vy0 } = bearingToVelocity(0, 100);
  assert.ok(Math.abs(vx0) < 1e-10, `N bearing vx`);
  assert.ok(Math.abs(vy0 - 100) < 1e-10, `N bearing vy`);
  const { vx: vx90, vy: vy90 } = bearingToVelocity(90, 100);
  assert.ok(Math.abs(vx90 - 100) < 1e-10, `E bearing vx`);
  assert.ok(Math.abs(vy90) < 1e-10, `E bearing vy`);
}

console.log('All physics tests passed.');
