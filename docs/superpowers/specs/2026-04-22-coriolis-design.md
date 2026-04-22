# Coriolis Simulator — Design Spec

**Date:** 2026-04-22
**Project:** GMAR-FisicaI — Physics I for Marine Science students
**Output:** `simulations/coriolis/coriolis.html` (fully self-contained)

---

## Overview

An interactive Coriolis effect simulator for first-year Marine Science students. A particle is launched on a hemisphere disc and its trajectory is animated simultaneously in two reference frames: the rotating (Earth) frame and the absolute (inertial) frame. Students control initial conditions via a panel of sliders and buttons. The output is a single portable HTML file with no external dependencies, openable in any browser locally or hosted on a server.

---

## Architecture

Single file: `coriolis.html` with inline CSS and a companion `coriolis.js` (included via `<script src>`). Both files live in `simulations/coriolis/`. No build step, no server, no external libraries.

```
simulations/
  coriolis/
    coriolis.html   ← page structure, inline CSS, loads coriolis.js
    coriolis.js     ← physics engine, animation loop, rendering
```

The HTML file and JS file are kept separate for readability during development. For distribution, the JS can be inlined into the HTML to produce a single-file artifact.

---

## Layout

**Responsive two-column layout:**
- On wide screens (≥ 768 px): two Canvas panels side-by-side, equal width
- On narrow screens (< 768 px): panels stack vertically

```
┌─────────────────────────────────────────────┐
│  Title + one-line description               │
├──────────────────┬──────────────────────────┤
│  Rotating Frame  │  Absolute Frame          │
│  (Canvas)        │  (Canvas)                │
├──────────────────┴──────────────────────────┤
│  Controls panel                             │
│  [NH/SH] [Ω slider] [speed] [direction]    │
│  [click disc to set position]               │
│  [Play] [Pause] [Reset]                     │
└─────────────────────────────────────────────┘
```

---

## Controls

| Control | Type | Range / Default |
|---|---|---|
| Hemisphere | Toggle button (NH / SH) | NH |
| Earth rotation rate | Slider | 0× – 5× real Ω, default 1× |
| Initial speed | Slider | 0 – 1000 m/s, default 200 m/s |
| Initial direction | Slider | 0° – 360°, default 90° (East) |
| Initial position | Click on disc | Default: centre of disc |
| Play / Pause / Reset | Buttons | — |

Initial position is set by clicking directly on either hemisphere disc. A small crosshair marks the selected point. Lat/lon coordinates are shown as a numeric readout next to the disc.

Sliders show their current numeric value beside them. Changing any slider while the animation is running resets and restarts automatically.

---

## Physics

**Model:** 2D flat-plane approximation tangent to Earth's surface — valid for the trajectory scales shown on a hemisphere disc. Earth is not curved in the simulation plane.

**Equations of motion (rotating frame):**

```
dv/dt = -2Ω × v   (Coriolis acceleration)
```

Where:
- **Ω** = rotation vector, magnitude `Ω_real × multiplier`, pointing up (NH) or down (SH)
- **v** = 2D velocity of the particle in the rotating frame

The centrifugal term is omitted (negligible at these scales and speeds).

**Integration:** 4th-order Runge-Kutta, time step tied to `requestAnimationFrame` (~60 fps). Simulation time is scaled so trajectories are visible within a few seconds of animation.

**Absolute frame:** computed by integrating the same initial conditions without the Coriolis term (particle moves in a straight line).

Time is accelerated: 1 second of animation represents 1 hour of real time (configurable constant in code). This makes Coriolis deflection visible within ~5–10 seconds of animation. Both frames are integrated in parallel on each animation frame.

**Boundary condition:** if the particle exits the disc radius, the animation pauses and an overlay message reads "Particle left the hemisphere — press Reset to continue."

---

## Rendering

**Canvas 2D API** — one canvas per panel, redrawn each frame.

**Hemisphere disc:**
- Dark ocean fill (`#1a3a4a`)
- Graticule: latitude circles every 30°, longitude lines every 30°, thin white lines at 10% opacity
- Continent outlines: simplified hardcoded Canvas paths (approximate polygons sufficient to orient students geographically)
- Subtle outer glow via `shadowBlur` on the disc circle

**Particle:**
- Small filled white circle (radius 5 px)
- Motion blur: last 4 positions drawn at 75%, 50%, 25%, 10% opacity

**Trail:**
- Accumulating polyline in amber/orange (`#f0a500`), 1.5 px stroke
- Cleared on Reset

**Annotations (both panels):**
- Velocity arrow: white, scaled to current speed, with arrowhead
- Coriolis force arrow: cyan (`#00d4d4`), scaled to acceleration magnitude, with arrowhead
- Info box (top-right of each canvas): current speed (m/s), deflection angle from initial bearing (°), elapsed simulation time (s)

**Panel labels:** "Rotating Frame" and "Absolute Frame" as text overlaid at the top of each canvas.

---

## Visual Style

- Background: `#0f1117` (near-black)
- Text: `#e0e0e0`
- Accent: `#2a7a8a` (muted blue-green)
- Font: system sans-serif stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`)
- No external fonts or icon libraries
- Controls panel: clean, minimal — sliders with numeric labels, no decorative borders

---

## File Distribution

For classroom use, the professor can:
1. Open `simulations/coriolis/coriolis.html` directly in a browser (local file)
2. Upload both `coriolis.html` and `coriolis.js` to any static web server

For a single-file distribution, a simple Python script (`build.py`) can inline `coriolis.js` into `coriolis.html` producing `coriolis-standalone.html`.

---

## Out of Scope (this version)

- 3D sphere view (noted as future work)
- Centrifugal force term
- Multiple simultaneous particles
- Recording / exporting trajectories
- Real geographic map image (using simplified SVG graticule + continent outlines instead)
