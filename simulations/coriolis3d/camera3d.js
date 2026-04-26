// simulations/coriolis3d/camera3d.js

function initOrbit(canvas) {
  const orbit = {
    theta:      0.3,
    phi:        0.25,
    radius:     3.0,
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
    orbit.theta -= dx * 0.006;
    orbit.phi   += dy * 0.006;
    orbit.phi    = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, orbit.phi));
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

// Centre the camera on initPos (Earth-fixed unit vector = inertial at t=0).
function resetOrbit(orbit, initPos) {
  orbit.theta  = Math.atan2(initPos.x, initPos.z);
  orbit.phi    = Math.asin(Math.max(-1, Math.min(1, initPos.y)));
  orbit.radius = 3.0;
}

// Position camera from spherical orbit angles, world-Y projected up.
function updateCamera(camera, orbit) {
  const phiPolar = Math.PI / 2 - orbit.phi;
  const nx = Math.sin(phiPolar) * Math.sin(orbit.theta);
  const ny = Math.cos(phiPolar);
  const nz = Math.sin(phiPolar) * Math.cos(orbit.theta);

  camera.position.set(nx * orbit.radius, ny * orbit.radius, nz * orbit.radius);

  const ux = -ny * nx, uy = 1 - ny * ny, uz = -ny * nz;
  const uLen = Math.sqrt(ux*ux + uy*uy + uz*uz);
  if (uLen > 1e-6) {
    camera.up.set(ux/uLen, uy/uLen, uz/uLen);
  } else {
    camera.up.set(0, 0, -1);
  }

  camera.lookAt(0, 0, 0);
}
