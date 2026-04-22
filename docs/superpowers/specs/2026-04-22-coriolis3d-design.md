# Coriolis 3D Simulator — Design Spec

**Date:** 2026-04-22
**Project:** GMAR-FisicaI — Physics I for Marine Science students
**Output:** `simulations/coriolis3d/` folder (self-contained, works offline and on server)

---

## Overview

A single-panel 3D Coriolis effect simulator using a spherical Earth rendered with Three.js. Students can switch between four reference frames to understand why the Coriolis effect appears in rotating frames but not in inertial space. The design matches the existing 2-panel simulator (dark theme, same colour palette).

The existing 2-panel simulator (`simulations/coriolis/`) is **not modified**.

---

## File Structure

```
simulations/coriolis3d/
  coriolis3d.html   — page structure, inline CSS, loads all JS
  physics3d.js      — 3D Coriolis physics on sphere surface (pure functions, testable)
  scene3d.js        — Three.js scene: Earth, atmosphere, graticule, particle, trail, arrows
  camera3d.js       — 4 reference frame camera logic + OrbitControls offset
  controls3d.js     — UI event wiring (sliders, buttons, clicks)
  main3d.js         — animation loop, state, wiring
  vendor/
    three.min.js    — Three.js r158 minified (~600 KB, bundled for offline use)
    OrbitControls.js — Three.js OrbitControls addon
tests/
  coriolis3d/
    physics3d.test.js — Node.js unit tests for physics3d.js
```

---

## Physics

**Model:** Full 3D Coriolis on a sphere surface. The particle moves on the surface of the unit sphere (radius = 1 in Three.js units, scaled to `EARTH_RADIUS = 6 371 000 m` for real-unit calculations).

**Equation of motion (rotating frame):**
```
dv/dt = -2Ω × v
```
where **Ω** is the full 3D angular velocity vector along Earth's rotation axis (+Y axis, North Pole up):
```
Ω = (0, Ω_real / period_hours × 3600, 0)   [rad/s]
```
The centrifugal term is omitted (small relative to Coriolis at typical simulation speeds).

**Surface constraint:** After each integration step, position is re-normalised to the unit sphere and velocity is projected onto the local tangent plane (removing any radial component), keeping the particle on the surface.

**Integration:** 4th-order Runge-Kutta. Time scale: 1 animation second = 1 real hour. RK4 `dt` = actual frame elapsed time × 3600.

**Coordinate system:** Three.js right-handed, Y-up. Earth centre at origin. North Pole = (0, 1, 0). Prime meridian (lon=0°, lat=0°) = (1, 0, 0).

**Position ↔ lat/lon:**
```
x = cos(lat) × cos(lon)
y = sin(lat)
z = -cos(lat) × sin(lon)   [negative z = East in right-handed Y-up]
```

**Rotation rate:** Default period = 23.93 hours (1 real Earth rotation). Slider range: 1 h – 100 h. Displayed in hours on the slider and in the info box.

---

## Reference Frames

All 4 modes run the **same single physics simulation** in the rotating (Earth) frame. The camera position is recomputed each frame based on mode.

| Mode | Label | Earth rotates on screen? | Camera follows particle? |
|---|---|---|---|
| Fixed (inertial) | Fixed | Yes | No |
| Rotating with Earth | Earth | No | No |
| Follow particle, inertial | Follow | Yes | Yes |
| Follow particle, rotating | Follow+Rot | No | Yes |

**Earth rotation angle:** `θ = 2π × elapsedReal / (period_h × 3600)` radians.

**Camera logic per mode:**

- **Fixed:** Camera at fixed position in inertial space. Earth `group` rotated by `θ` around Y-axis each frame. Camera `lookAt` = Earth centre.
- **Earth:** Earth `group` not rotated (camera sees fixed continents). Camera at fixed position. Camera `lookAt` = Earth centre.
- **Follow (inertial):** Camera positioned at `particle_inertial_pos + offset`. `particle_inertial_pos = R(-θ) × particle_earth_pos` (convert Earth-fixed to inertial). Earth `group` rotated by `θ`. Offset = `particle_up × 0.5 + particle_pos.normalize() × 0.3` (above and behind in inertial space).
- **Follow+Rot:** Camera positioned at `particle_earth_pos + offset`. Earth `group` not rotated. Same offset formula in Earth-fixed space.

**OrbitControls offset:** User drag stores a quaternion offset `q_user`. Applied on top of the frame camera each frame: `camera.position = q_user.apply(frame_camera_pos)`. Held until Reset is pressed (Reset clears `q_user` to identity).

---

## 3D Rendering

**Earth sphere:**
- `THREE.SphereGeometry(1, 64, 64)`
- Texture: NASA Blue Marble 2048×1024 JPG, loaded from `vendor/earth.jpg` (bundled, ~400 KB)
- `THREE.MeshPhongMaterial` with specular highlight for ocean gloss

**Atmosphere:**
- `THREE.SphereGeometry(1.02, 32, 32)` slightly larger than Earth
- `THREE.MeshBasicMaterial` colour `#1a6699`, opacity 0.15, transparent, side `THREE.BackSide`
- Additive blending gives a subtle blue glow

**Graticule:**
- `THREE.LineSegments`: latitude circles every 30°, longitude lines every 30°
- Colour: `rgba(255,255,255,0.08)`, same as 2D simulator

**Particle:**
- `THREE.SphereGeometry(0.02, 16, 16)` at surface position (normalised to radius 1.01 so it sits above the surface)
- `THREE.MeshBasicMaterial` white, emissive glow via point light at particle position (intensity 0.3, distance 0.5)

**Trail:**
- `THREE.Line` with `THREE.BufferGeometry`, pre-allocated 10 000 points
- Colour `#f0a500` (amber, same as 2D simulator)
- Trail points stored in Earth-fixed (rotating) 3D coordinates. Each frame, all trail points are transformed into the current display frame before uploading to the GPU: for Fixed/Follow modes, apply `R(-θ)` to convert to inertial coords; for Earth/Follow+Rot modes, use Earth-fixed coords directly.

**Arrows:**
- Velocity: `THREE.ArrowHelper`, white, length proportional to speed (clamped 0.05–0.3 units)
- Coriolis force: `THREE.ArrowHelper`, cyan `#00d4d4`, shown only in rotating-frame modes (Earth, Follow+Rot)

**Crosshair:** Small `THREE.LineSegments` cross on the sphere surface at the initial particle position (4 short lines in a + pattern on the tangent plane).

**Lighting:**
- `THREE.DirectionalLight` intensity 1.2, position (5, 3, 5) — fixed in inertial space
- `THREE.AmbientLight` intensity 0.15 — night side visible but dark

---

## Controls

**Frame toggle row:**
```
[ Fixed ] [ Earth ] [ Follow ] [ Follow+Rot ]
```
Active frame button highlighted in `#2a7a8a`. Switching frame does not reset the simulation.

**Sliders:**

| ID | Label | Range | Default | Unit |
|---|---|---|---|---|
| `slider-period` | Rotation period | 1 – 100 | 23.93 | h |
| `slider-speed` | Particle speed | 0 – 1000 | 200 | m/s |
| `slider-bearing` | Bearing | 0 – 360 | 90 | ° |

Changing any slider pauses and resets the simulation.

**Click-to-place:** Raycasting against the Earth sphere mesh. On valid hit, crosshair moves to clicked point. Lat/lon displayed in info box immediately. Simulation resets.

**Buttons:** Play, Pause, Reset (same style as existing simulator). Reset also clears the OrbitControls user offset.

**Info box** (top-right of canvas, `#161b22` background, 80% opacity):
```
Lat:  45.2°N    Lon: 12.4°E
Time:  14.3 h
Period: 23.93 h
Speed:  200 m/s
```
Updates every frame during animation. Lat/lon shows rotating-frame geographic position (same in all frame modes — it's the particle's location on Earth).

---

## Visual Style

Identical palette to existing simulator:

| Element | Value |
|---|---|
| Page background | `#0f1117` |
| Text | `#e0e0e0` |
| Accent / active | `#2a7a8a` |
| Trail | `#f0a500` |
| Velocity arrow | `#ffffff` |
| Coriolis arrow | `#00d4d4` |
| Controls panel bg | `#161b22` |
| Font | System sans-serif stack |

Canvas is square, fills available width up to 700 px, centred on page.

---

## Out of Scope (this version)

- Multiple simultaneous particles
- Axial tilt (Earth axis stays vertical: North Pole = +Y)
- Centrifugal term in equations of motion
- Exporting / recording trajectories
- Mobile touch drag for OrbitControls (mouse only)
