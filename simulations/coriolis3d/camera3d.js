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
    prevFwdX:   1,   // last valid e_fwd (velocity tangent) for follow mode
    prevFwdY:   0,
    prevFwdZ:   0,
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
      // Drag-the-particle: thetaOff = e_right offset, phiOff = e_fwd offset of camera
      // direction in the particle's local tangent plane. Drag right → particle on the
      // right; drag down → particle lower. Earth's centre stays fixed at origin.
      orbit.thetaOff += dx * 0.006;
      orbit.phiOff   += dy * 0.006;
      // Clamp combined magnitude so camera stays on the upper hemisphere of the local frame.
      const maxR = Math.PI/2 - 0.05;
      const r2 = orbit.thetaOff*orbit.thetaOff + orbit.phiOff*orbit.phiOff;
      if (r2 > maxR*maxR) {
        const s = maxR / Math.sqrt(r2);
        orbit.thetaOff *= s; orbit.phiOff *= s;
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

// Position camera.
//
//   Fixed / Earth: camera at absolute (theta, phi) on a sphere around origin,
//                  camera.up = geographic north, lookAt origin.
//
//   Follow:        Earth's centre stays fixed at the origin. The camera orbits a
//                  small distance away from the particle's radial direction so that
//                  the user can drag the particle around the screen. Offsets are
//                  expressed in the particle's local tangent plane:
//                    phiOff  = projection along  e_fwd  (drag down → +)
//                    thetaOff= projection along  e_right (drag right → +)
//                  Camera direction:
//                    n = cos(R)·e_up + sinc(R)·(phiOff·e_fwd + thetaOff·e_right)
//                    where R = √(phiOff² + thetaOff²), so n is a unit vector that
//                    leaves e_up at the rate phiOff/thetaOff request.
//                  The local frame parallel-transports along the geodesic, so the
//                  particle's screen position stays locked even as it moves; pole
//                  crossings are smooth because every basis vector evolves smoothly.
function updateCamera(camera, orbit, mode, particleWorldPos, velWorld) {
  if (mode === 'follow') {
    // e_up — radial direction at particle
    let upX = particleWorldPos.x, upY = particleWorldPos.y, upZ = particleWorldPos.z;
    const pLen = Math.sqrt(upX*upX + upY*upY + upZ*upZ);
    if (pLen > 1e-6) { upX /= pLen; upY /= pLen; upZ /= pLen; }

    // e_fwd — velocity tangent (with prev-fallback when speed ≈ 0)
    let fwdX = orbit.prevFwdX, fwdY = orbit.prevFwdY, fwdZ = orbit.prevFwdZ;
    if (velWorld) {
      const vx = velWorld.x, vy = velWorld.y, vz = velWorld.z;
      const vDotUp = vx*upX + vy*upY + vz*upZ;
      const tanX = vx - vDotUp*upX, tanY = vy - vDotUp*upY, tanZ = vz - vDotUp*upZ;
      const tLen = Math.sqrt(tanX*tanX + tanY*tanY + tanZ*tanZ);
      if (tLen > 0.1) {
        fwdX = tanX/tLen; fwdY = tanY/tLen; fwdZ = tanZ/tLen;
        orbit.prevFwdX = fwdX; orbit.prevFwdY = fwdY; orbit.prevFwdZ = fwdZ;
      }
    }

    // e_right = e_up × e_fwd
    const rightX = upY*fwdZ - upZ*fwdY;
    const rightY = upZ*fwdX - upX*fwdZ;
    const rightZ = upX*fwdY - upY*fwdX;

    // Camera direction: tilt e_up by (phiOff, thetaOff) in the (e_fwd, e_right) plane.
    const a = orbit.phiOff, b = orbit.thetaOff;
    const r = Math.sqrt(a*a + b*b);
    const cR = Math.cos(r);
    const sinc = (r > 1e-6) ? Math.sin(r) / r : 1;     // sin(r)/r, → 1 as r → 0
    const tFwd = sinc * a, tRight = sinc * b;
    const nx = cR*upX + tFwd*fwdX + tRight*rightX;
    const ny = cR*upY + tFwd*fwdY + tRight*rightY;
    const nz = cR*upZ + tFwd*fwdZ + tRight*rightZ;

    camera.position.set(nx*orbit.radius, ny*orbit.radius, nz*orbit.radius);

    // camera.up = e_fwd projected ⊥ to camera direction (= -n, since lookAt(origin)).
    // Equivalent to e_fwd − (e_fwd·n)·n.
    const fwdDotN = fwdX*nx + fwdY*ny + fwdZ*nz;
    const upPx = fwdX - fwdDotN*nx;
    const upPy = fwdY - fwdDotN*ny;
    const upPz = fwdZ - fwdDotN*nz;
    const upPLen = Math.sqrt(upPx*upPx + upPy*upPy + upPz*upPz);
    if (upPLen > 1e-6) {
      orbit.prevUpX = upPx/upPLen; orbit.prevUpY = upPy/upPLen; orbit.prevUpZ = upPz/upPLen;
    }
    camera.up.set(orbit.prevUpX, orbit.prevUpY, orbit.prevUpZ);
    camera.lookAt(0, 0, 0);
    return;
  }

  // ── Fixed / Earth modes ─────────────────────────────────────────────
  const phiPolar = Math.PI / 2 - orbit.phi;
  const nx = Math.sin(phiPolar) * Math.sin(orbit.theta);
  const ny = Math.cos(phiPolar);
  const nz = Math.sin(phiPolar) * Math.cos(orbit.theta);

  camera.position.set(nx * orbit.radius, ny * orbit.radius, nz * orbit.radius);

  // camera.up = geographic north (worldY projected ⊥ to camera direction).
  const ux = -ny*nx, uy = 1 - ny*ny, uz = -ny*nz;
  const uLen = Math.sqrt(ux*ux + uy*uy + uz*uz);
  if (uLen > 1e-6) {
    orbit.prevUpX = ux/uLen; orbit.prevUpY = uy/uLen; orbit.prevUpZ = uz/uLen;
    camera.up.set(ux/uLen, uy/uLen, uz/uLen);
  } else {
    camera.up.set(orbit.prevUpX, orbit.prevUpY, orbit.prevUpZ);
  }

  camera.lookAt(0, 0, 0);
}
