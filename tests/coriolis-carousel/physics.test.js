// tests/coriolis-carousel/physics.test.js
const assert = require('assert');

const {
  rotateVec, add, scale, mag,
  computeLaunch, flightDuration,
  ballGroundPos, platformPointGroundPos,
  missVector, platformVelocity, circleInterceptTime,
} = require('../../simulations/coriolis-carousel/physics.js');

const approx = (a, b, eps, msg) => assert.ok(Math.abs(a - b) < eps, `${msg}: expected ${b}, got ${a}`);

// rotateVec: 90 deg CCW sends (1,0) -> (0,1)
{
  const r = rotateVec({ x: 1, y: 0 }, Math.PI / 2);
  approx(r.x, 0, 1e-9, 'rotateVec x');
  approx(r.y, 1, 1e-9, 'rotateVec y');
}

// Session guide Problem 3: R=4m, Omega=0.5 rad/s, v=5 m/s, naive aim, Ana at centre.
// Expected: t=0.8s, miss ~= 1.6 m, ball lands to Ana's right of Ben (Omega>0 = CCW).
// Note: the guide's own s=Omega*v*t^2 is itself a small-angle (arc ~= chord)
// approximation; the exact geometric miss is 2R*sin(Omega*t/2) = 1.5894 m,
// about 1cm under the textbook's rounded 1.6 m — hence the looser tolerance.
{
  const R = 4, OMEGA = 0.5, V = 5;
  const ana = { x: 0, y: 0 };
  const ben0 = { x: 0, y: R };

  const launch = computeLaunch(ana, ben0, V, OMEGA, 'naive');
  approx(launch.distance, R, 1e-9, 'naive distance == R (centre throw)');

  const t = flightDuration(launch.distance, V);
  approx(t, 0.8, 1e-9, 'flight time');

  const ballPos = ballGroundPos(ana, launch.dir, V, t);
  const benPos  = platformPointGroundPos(ben0, OMEGA, t);
  const miss    = mag(missVector(ballPos, benPos));
  approx(miss, 1.6, 0.02, 'miss distance (Problem 3b/c, small-angle approx in the guide)');

  // Ball lands "to Ana's right of Ben": with Ana looking from (0,0) towards
  // +y, "right" is +x. Ball ends up at x=0 (straight ahead); Ben has swept
  // to negative x (CCW rotation from the top of the circle), so the ball is
  // at a larger x than Ben — i.e. to Ben's right as seen by Ana.
  assert.ok(ballPos.x > benPos.x, 'ball lands to the right of Ben (CCW platform)');
}

// Lead-compensated aim from the centre is exact: every point on the rim is
// equidistant from the centre, so the lead angle doesn't change the flight
// time, and the ball should land exactly on Ben.
{
  const R = 4, OMEGA = 0.5, V = 5;
  const ana = { x: 0, y: 0 };
  const ben0 = { x: 0, y: R };

  const launch = computeLaunch(ana, ben0, V, OMEGA, 'lead');
  const t = flightDuration(launch.distance, V);
  const ballPos = ballGroundPos(ana, launch.dir, V, t);
  const benPos  = platformPointGroundPos(ben0, OMEGA, t);
  approx(mag(missVector(ballPos, benPos)), 0, 1e-9, 'centre-throw lead aim is an exact hit');
}

// Edge-to-edge (diametrically opposite): naive aim still misses, and the
// lead-compensated aim gets much closer (though not exact, since the aim
// point shifts the flight distance slightly away from the diameter).
{
  const R = 4, OMEGA = 0.5, V = 5;
  const ana  = { x: 0, y: R };
  const ben0 = { x: 0, y: -R };

  const naive = computeLaunch(ana, ben0, V, OMEGA, 'naive');
  const tN = flightDuration(naive.distance, V);
  const missNaive = mag(missVector(ballGroundPos(ana, naive.dir, V, tN), platformPointGroundPos(ben0, OMEGA, tN)));

  const lead = computeLaunch(ana, ben0, V, OMEGA, 'lead');
  const tL = flightDuration(lead.distance, V);
  const missLead = mag(missVector(ballGroundPos(ana, lead.dir, V, tL), platformPointGroundPos(ben0, OMEGA, tL)));

  assert.ok(missLead < missNaive, `lead aim (${missLead.toFixed(3)}) should beat naive aim (${missNaive.toFixed(3)})`);
}

// Omega=0: no rotation, naive aim always hits exactly (classic non-rotating catch).
{
  const ana = { x: 0, y: 0 };
  const ben0 = { x: 0, y: 4 };
  const launch = computeLaunch(ana, ben0, 5, 0, 'naive');
  const t = flightDuration(launch.distance, 5);
  const ballPos = ballGroundPos(ana, launch.dir, 5, t);
  const benPos  = platformPointGroundPos(ben0, 0, t);
  approx(mag(missVector(ballPos, benPos)), 0, 1e-9, 'no rotation: exact hit');
}

// platformVelocity: zero at the centre, magnitude Omega*R at the rim,
// direction matches the CCW sense used throughout (top of rim moves to -x).
{
  const v0 = platformVelocity({ x: 0, y: 0 }, 0.5);
  approx(mag(v0), 0, 1e-12, 'platformVelocity at centre is zero');

  const vRim = platformVelocity({ x: 0, y: 4 }, 0.5);
  approx(vRim.x, -2, 1e-9, 'platformVelocity at rim (top), x');
  approx(vRim.y, 0, 1e-9, 'platformVelocity at rim (top), y');
}

// circleInterceptTime: ball from the centre at speed 5 reaches radius 4 at t=0.8s
// (matches flightDuration for the simple radial case).
{
  const t = circleInterceptTime({ x: 0, y: 0 }, { x: 0, y: 5 }, 4);
  approx(t, 0.8, 1e-9, 'circleInterceptTime from centre');
}

// circleInterceptTime: starting already ON the circle (edge-to-edge case)
// discards the t~0 root and finds the other crossing.
{
  // Straight down the diameter from (0,4) to (0,-4) at speed 5: crosses back
  // onto the R=4 circle after travelling the full diameter, t = 8/5 = 1.6s.
  const t = circleInterceptTime({ x: 0, y: 4 }, { x: 0, y: -5 }, 4);
  approx(t, 1.6, 1e-9, 'circleInterceptTime from the rim (diameter crossing)');
}

// Relative velocity mode: adding Ana's own platform velocity to the throw
// reproduces the same physics as the old dir/speed-only path when Ana is at
// the centre (her own velocity is zero there), via the general vel+intercept
// route that the simulator now uses for both modes.
{
  const R = 4, OMEGA = 0.5, V = 5;
  const ana = { x: 0, y: 0 };
  const ben0 = { x: 0, y: R };

  const launch = computeLaunch(ana, ben0, V, OMEGA, 'naive');
  const anaVel = platformVelocity(ana, OMEGA);
  const vel = add(anaVel, scale(launch.dir, V));
  const t = circleInterceptTime(ana, vel, R);
  approx(t, 0.8, 1e-9, 'relative mode == absolute mode at the centre (t)');
  const ballPos = add(ana, scale(vel, t));
  const benPos = platformPointGroundPos(ben0, OMEGA, t);
  approx(mag(missVector(ballPos, benPos)), 1.6, 0.02, 'relative mode == absolute mode at the centre (miss)');
}

// Relative velocity mode changes the outcome once Ana is on the rim: her own
// carried velocity adds to the throw, so the resulting miss differs from the
// absolute-mode case (sanity check: it's a different, still-finite number).
{
  const R = 4, OMEGA = 0.5, V = 5;
  const ana = { x: 0, y: R };
  const ben0 = { x: 0, y: -R };

  const launch = computeLaunch(ana, ben0, V, OMEGA, 'naive');
  const absVel = scale(launch.dir, V);
  const tAbs = circleInterceptTime(ana, absVel, R);
  const missAbs = mag(missVector(add(ana, scale(absVel, tAbs)), platformPointGroundPos(ben0, OMEGA, tAbs)));

  const anaVel = platformVelocity(ana, OMEGA);
  const relVel = add(anaVel, scale(launch.dir, V));
  const tRel = circleInterceptTime(ana, relVel, R);
  assert.ok(tRel !== null && isFinite(tRel), 'relative-mode intercept time is finite');
  const missRel = mag(missVector(add(ana, scale(relVel, tRel)), platformPointGroundPos(ben0, OMEGA, tRel)));

  assert.ok(Math.abs(missRel - missAbs) > 1e-6, 'relative mode gives a different miss than absolute mode on the rim');
}

console.log('All coriolis-carousel physics tests passed.');
