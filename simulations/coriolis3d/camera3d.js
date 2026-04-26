// simulations/coriolis3d/camera3d.js

function initOrbit(canvas) {
  const orbit = {
    theta:      0.3,
    phi:        0.25,
    radius:     3.0,
    thetaOff:   0,    // follow-mode offset from particle direction
    phiOff:     0,
    isDragging: false,
    didDrag:    false,
    lastX:      0,
    lastY:      0,
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
      // Clamp so total elevation (particle lat + phiOff) stays in [-π/2, π/2].
      if (typeof state3D !== 'undefined' && state3D.pos) {
        const phi_p = Math.asin(Math.max(-1, Math.min(1, state3D.pos.y)));
        orbit.phiOff = Math.max(-Math.PI/2 - phi_p, Math.min(Math.PI/2 - phi_p, orbit.phiOff));
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

// Centre the camera on initPos and reset offsets.
function resetOrbit(orbit, initPos) {
  orbit.theta    = Math.atan2(initPos.x, initPos.z);
  orbit.phi      = Math.asin(Math.max(-1, Math.min(1, initPos.y)));
  orbit.radius   = 3.0;
  orbit.thetaOff = 0;
  orbit.phiOff   = 0;
}

// Position camera.
//   Fixed / Earth: camera from absolute orbit.theta / orbit.phi.
//   Follow: camera direction = particle world direction rotated by (thetaOff, phiOff).
//           particleWorldPos must be supplied (unit vector).
function updateCamera(camera, orbit, mode, particleWorldPos) {
  let nx, ny, nz;

  if (mode === 'follow') {
    // Start from the particle's world direction.
    let px = particleWorldPos.x, py = particleWorldPos.y, pz = particleWorldPos.z;
    const pLen = Math.sqrt(px*px + py*py + pz*pz);
    if (pLen > 1e-6) { px /= pLen; py /= pLen; pz /= pLen; }

    // Step 1 — thetaOff: rotate around world-Y.
    const ct = Math.cos(orbit.thetaOff), st = Math.sin(orbit.thetaOff);
    const d1x =  px*ct + pz*st;
    const d1y =  py;
    const d1z = -px*st + pz*ct;

    // Step 2 — phiOff: elevation rotation about the local east axis.
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
    // Fixed / Earth: camera from absolute orbit angles.
    const phiPolar = Math.PI / 2 - orbit.phi;
    nx = Math.sin(phiPolar) * Math.sin(orbit.theta);
    ny = Math.cos(phiPolar);
    nz = Math.sin(phiPolar) * Math.cos(orbit.theta);
  }

  camera.position.set(nx * orbit.radius, ny * orbit.radius, nz * orbit.radius);

  // camera.up: world-Y projected perpendicular to look direction.
  const ux = -ny*nx, uy = 1 - ny*ny, uz = -ny*nz;
  const uLen = Math.sqrt(ux*ux + uy*uy + uz*uz);
  if (uLen > 1e-6) {
    camera.up.set(ux/uLen, uy/uLen, uz/uLen);
  } else {
    camera.up.set(0, 0, -1);
  }

  camera.lookAt(0, 0, 0);
}
