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
    prevUpX:    0,   // last valid camera.up — fallback at the world poles
    prevUpY:    1,
    prevUpZ:    0,
    prevFwdX:   1,   // parallel-transported tangent at the particle (follow mode)
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
      // Drag offsets in the particle-local tangent frame (e_fwd, e_right). With
      // camera.up = e_fwd and lookAt(origin), three.js sets x_cam = -e_right and
      // y_cam = e_fwd, so a tilt of camera position toward +e_right pushes the
      // particle to screen +X, and toward +e_fwd pushes it to screen -Y.
      //   dx > 0 (drag right) → particle on right  → thetaOff (e_right tilt) +=
      //   dy > 0 (drag down)  → particle on bottom → phiOff   (e_fwd   tilt) +=
      orbit.thetaOff += dx * 0.006;
      orbit.phiOff   += dy * 0.006;
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
  // Seed prevUp / prevFwd to geographic north at initPos. In follow mode,
  // camera.up = e_fwd, so e_fwd = north gives the standard "north-up" view.
  seedFollowFrame(orbit, initPos);
}

// Set prevFwd (and prevUp) to geographic north at the given position. Falls
// back to (1,0,0) at the world poles where north is undefined.
function seedFollowFrame(orbit, pos) {
  const py = pos.y, px = pos.x, pz = pos.z;
  const ux = -py*px, uy = 1 - py*py, uz = -py*pz;
  const uLen = Math.sqrt(ux*ux + uy*uy + uz*uz);
  if (uLen > 1e-6) {
    const nx = ux/uLen, ny = uy/uLen, nz = uz/uLen;
    orbit.prevUpX  = nx; orbit.prevUpY  = ny; orbit.prevUpZ  = nz;
    orbit.prevFwdX = nx; orbit.prevFwdY = ny; orbit.prevFwdZ = nz;
  } else {
    orbit.prevUpX  = 0; orbit.prevUpY  = 1; orbit.prevUpZ  = 0;
    orbit.prevFwdX = 1; orbit.prevFwdY = 0; orbit.prevFwdZ = 0;
  }
}

// Position camera.
//
//   Fixed / Earth: camera at absolute (theta, phi) on a sphere around origin,
//                  camera.up = geographic north, lookAt origin.
//
//   Follow:        Earth always rotates around its centre (camera orbits the world
//                  origin, never pivots around the particle). Drag offsets (phiOff,
//                  thetaOff) live in a particle-local tangent frame (e_up, e_fwd,
//                  e_right) that PARALLEL-TRANSPORTS each frame — projecting prev
//                  e_fwd onto the current tangent plane — so the particle stays
//                  anchored at its dragged screen position smoothly across world
//                  poles. e_fwd is *not* recomputed from velocity each frame, so
//                  changing speed/direction does not perturb the camera up.
function updateCamera(camera, orbit, mode, particleWorldPos) {
  if (mode === 'follow') {
    // e_up — radial direction at particle.
    let upX = particleWorldPos.x, upY = particleWorldPos.y, upZ = particleWorldPos.z;
    const pLen = Math.sqrt(upX*upX + upY*upY + upZ*upZ);
    if (pLen > 1e-6) { upX /= pLen; upY /= pLen; upZ /= pLen; }

    // e_fwd — parallel-transport prev fwd onto current tangent plane. If it has
    // gone (near-)radial, reseed to geographic east (= world-Y × e_up).
    let fwdX = orbit.prevFwdX, fwdY = orbit.prevFwdY, fwdZ = orbit.prevFwdZ;
    const fDotUp = fwdX*upX + fwdY*upY + fwdZ*upZ;
    fwdX -= fDotUp*upX; fwdY -= fDotUp*upY; fwdZ -= fDotUp*upZ;
    let fLen = Math.sqrt(fwdX*fwdX + fwdY*fwdY + fwdZ*fwdZ);
    if (fLen < 0.5) {
      fwdX = upZ; fwdY = 0; fwdZ = -upX;
      fLen = Math.sqrt(fwdX*fwdX + fwdY*fwdY + fwdZ*fwdZ);
      if (fLen < 1e-6) { fwdX = 1; fwdY = 0; fwdZ = 0; fLen = 1; }
    }
    fwdX /= fLen; fwdY /= fLen; fwdZ /= fLen;
    orbit.prevFwdX = fwdX; orbit.prevFwdY = fwdY; orbit.prevFwdZ = fwdZ;

    // e_right = e_up × e_fwd.
    const rightX = upY*fwdZ - upZ*fwdY;
    const rightY = upZ*fwdX - upX*fwdZ;
    const rightZ = upX*fwdY - upY*fwdX;

    // Tilt e_up by angle r in the (e_fwd, e_right) plane to get the camera direction
    // n. The rotation axis ω lies in the tangent plane, perpendicular to the tilt
    // direction:  ω = (a·e_right − b·e_fwd) / r. Applying the SAME rotation to e_fwd
    // gives camera.up — this keeps unit length exactly (Rodrigues rotation preserves
    // norm), so there is no sign-flip / divide-by-near-zero flicker as r → π/2.
    const a = orbit.phiOff, b = orbit.thetaOff;
    const r = Math.sqrt(a*a + b*b);
    const cR = Math.cos(r), sR = Math.sin(r), ncR = 1 - cR;
    const sinc = (r > 1e-6) ? sR / r : 1;
    const tFwd = sinc * a, tRight = sinc * b;
    const nx = cR*upX + tFwd*fwdX + tRight*rightX;
    const ny = cR*upY + tFwd*fwdY + tRight*rightY;
    const nz = cR*upZ + tFwd*fwdZ + tRight*rightZ;

    camera.position.set(nx*orbit.radius, ny*orbit.radius, nz*orbit.radius);

    let upX_s, upY_s, upZ_s;
    if (r < 1e-6) {
      upX_s = fwdX; upY_s = fwdY; upZ_s = fwdZ;
    } else {
      const omegaX = (a*rightX - b*fwdX) / r;
      const omegaY = (a*rightY - b*fwdY) / r;
      const omegaZ = (a*rightZ - b*fwdZ) / r;
      const oDotF  = omegaX*fwdX + omegaY*fwdY + omegaZ*fwdZ;
      const oCrFx  = omegaY*fwdZ - omegaZ*fwdY;
      const oCrFy  = omegaZ*fwdX - omegaX*fwdZ;
      const oCrFz  = omegaX*fwdY - omegaY*fwdX;
      upX_s = fwdX*cR + oCrFx*sR + omegaX*oDotF*ncR;
      upY_s = fwdY*cR + oCrFy*sR + omegaY*oDotF*ncR;
      upZ_s = fwdZ*cR + oCrFz*sR + omegaZ*oDotF*ncR;
    }
    orbit.prevUpX = upX_s; orbit.prevUpY = upY_s; orbit.prevUpZ = upZ_s;
    camera.up.set(upX_s, upY_s, upZ_s);
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
