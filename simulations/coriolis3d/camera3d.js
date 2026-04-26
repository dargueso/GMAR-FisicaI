// simulations/coriolis3d/camera3d.js

function initOrbit(canvas) {
  const orbit = {
    theta:      0.3,
    phi:        0.25,
    radius:     3.0,
    thetaOff:   0,
    phiOff:     0,
    isDragging: false,
    didDrag:    false,
    lastX:      0,
    lastY:      0,
    prevUpX:    0,   // last valid camera.up — fallback when velocity is zero
    prevUpY:    1,
    prevUpZ:    0,
  };

  canvas.addEventListener('mousedown', (e) => {
    orbit.isDragging = true;
    orbit.didDrag    = false;
    orbit.lastX = e.clientX;
    orbit.lastY = e.clientY;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!orbit.isDragging) return;
    const dx = e.clientX - orbit.lastX;
    const dy = e.clientY - orbit.lastY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) orbit.didDrag = true;

    const fm = typeof state3D !== 'undefined' ? state3D.frameMode : 'fixed';
    if (fm === 'follow') {
      orbit.thetaOff -= dx * 0.006;
      orbit.phiOff   += dy * 0.006;
      // Clamp so total camera elevation stays away from poles.
      if (typeof state3D !== 'undefined' && state3D.pos) {
        const phi_p = Math.asin(Math.max(-1, Math.min(1, state3D.pos.y)));
        const eps   = 0.08;
        orbit.phiOff = Math.max(-Math.PI/2 + eps - phi_p,
                         Math.min( Math.PI/2 - eps - phi_p, orbit.phiOff));
      }
    } else {
      orbit.theta -= dx * 0.006;
      orbit.phi   += dy * 0.006;
      orbit.phi    = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, orbit.phi));
    }

    orbit.lastX = e.clientX;
    orbit.lastY = e.clientY;
    renderFrame3D();
  });

  canvas.addEventListener('mouseup',    () => { orbit.isDragging = false; });
  canvas.addEventListener('mouseleave', () => { orbit.isDragging = false; });

  canvas.addEventListener('wheel', (e) => {
    orbit.radius = Math.max(1.5, Math.min(10, orbit.radius + e.deltaY * 0.004));
    renderFrame3D();
  }, { passive: true });

  return orbit;
}

// Centre the camera on initPos and reset all offsets.
function resetOrbit(orbit, initPos) {
  orbit.theta    = Math.atan2(initPos.x, initPos.z);
  orbit.phi      = Math.asin(Math.max(-1, Math.min(1, initPos.y)));
  orbit.radius   = 3.0;
  orbit.thetaOff = 0;
  orbit.phiOff   = 0;
  // Seed prevUp to geographic north at initPos.
  const py = initPos.y, px = initPos.x, pz = initPos.z;
  const ux = -py*px, uy = 1 - py*py, uz = -py*pz;
  const uLen = Math.sqrt(ux*ux + uy*uy + uz*uz);
  if (uLen > 1e-6) { orbit.prevUpX = ux/uLen; orbit.prevUpY = uy/uLen; orbit.prevUpZ = uz/uLen; }
  else             { orbit.prevUpX = 0; orbit.prevUpY = 1; orbit.prevUpZ = 0; }
}

// Position camera. All modes look at Earth's centre (0,0,0).
//
//   Fixed / Earth: camera at absolute (theta, phi), camera.up = geographic north.
//
//   Follow: camera placed in the direction of (particle + thetaOff/phiOff).
//   camera.up = particle velocity projected onto the camera plane.
//   The velocity parallel-transports continuously through the poles, so the
//   view never flips or spins when the particle crosses a pole.
//   velWorld must be supplied (inertial-frame velocity, same space as particleWorldPos).
function updateCamera(camera, orbit, mode, particleWorldPos, velWorld) {
  let nx, ny, nz;

  if (mode === 'follow') {
    let px = particleWorldPos.x, py = particleWorldPos.y, pz = particleWorldPos.z;
    const pLen = Math.sqrt(px*px + py*py + pz*pz);
    if (pLen > 1e-6) { px /= pLen; py /= pLen; pz /= pLen; }

    // thetaOff: rotate camera direction around world-Y.
    const ct = Math.cos(orbit.thetaOff), st = Math.sin(orbit.thetaOff);
    const d1x =  px*ct + pz*st;
    const d1y =  py;
    const d1z = -px*st + pz*ct;

    // phiOff: elevate/depress camera relative to particle latitude.
    const eLen = Math.sqrt(d1x*d1x + d1z*d1z);
    if (eLen > 1e-6) {
      const cp = Math.cos(orbit.phiOff), sp = Math.sin(orbit.phiOff);
      nx = d1x*cp - (d1x*d1y/eLen)*sp;
      ny = d1y*cp + eLen*sp;
      nz = d1z*cp - (d1z*d1y/eLen)*sp;
    } else {
      nx = d1x; ny = d1y; nz = d1z;
    }

  } else {
    const phiPolar = Math.PI / 2 - orbit.phi;
    nx = Math.sin(phiPolar) * Math.sin(orbit.theta);
    ny = Math.cos(phiPolar);
    nz = Math.sin(phiPolar) * Math.cos(orbit.theta);
  }

  camera.position.set(nx * orbit.radius, ny * orbit.radius, nz * orbit.radius);

  if (mode === 'follow' && velWorld) {
    // camera.up = velocity direction projected perpendicular to the camera direction.
    // Velocity parallel-transports smoothly through poles — no flip, no spin.
    const vLen = Math.sqrt(velWorld.x*velWorld.x + velWorld.y*velWorld.y + velWorld.z*velWorld.z);
    if (vLen > 0.1) {
      const vx = velWorld.x/vLen, vy = velWorld.y/vLen, vz = velWorld.z/vLen;
      const d  = vx*nx + vy*ny + vz*nz;          // component along camera direction
      const ux = vx - d*nx, uy = vy - d*ny, uz = vz - d*nz;
      const uLen = Math.sqrt(ux*ux + uy*uy + uz*uz);
      if (uLen > 1e-6) {
        orbit.prevUpX = ux/uLen; orbit.prevUpY = uy/uLen; orbit.prevUpZ = uz/uLen;
        camera.up.set(ux/uLen, uy/uLen, uz/uLen);
      } else {
        camera.up.set(orbit.prevUpX, orbit.prevUpY, orbit.prevUpZ);
      }
    } else {
      camera.up.set(orbit.prevUpX, orbit.prevUpY, orbit.prevUpZ);
    }

  } else {
    // Fixed / Earth: geographic north (worldY projected ⊥ to camera direction).
    const ux = -ny*nx, uy = 1 - ny*ny, uz = -ny*nz;
    const uLen = Math.sqrt(ux*ux + uy*uy + uz*uz);
    if (uLen > 1e-6) {
      orbit.prevUpX = ux/uLen; orbit.prevUpY = uy/uLen; orbit.prevUpZ = uz/uLen;
      camera.up.set(ux/uLen, uy/uLen, uz/uLen);
    } else {
      camera.up.set(orbit.prevUpX, orbit.prevUpY, orbit.prevUpZ);
    }
  }

  camera.lookAt(0, 0, 0);
}
