// simulations/projectile/main.js

const state = {
  v0:    20,    // m/s
  angle: 45,    // degrees
  g:     9.81,  // m/s²
  h0:    0,     // m
  trajectories: [],   // each: { points, vx, vy0, tApex, hMax, tFlight, range, color, params, animElapsed }
  nextColorIdx: 0,
  showV:    false,
  showVx:   false,
  showVy:   false,
  paused:   false,
  hoveredApex: null,  // index into trajectories whose apex the mouse is over
};

let g_canvas;
let g_animRunning  = false;
let g_animLastTime = null;

function currentParams() {
  return { v0: state.v0, angle: state.angle, g: state.g, h0: state.h0 };
}

function previewTrajectory() {
  return sampleTrajectory(state.v0, state.angle, state.g, state.h0);
}

function rerender() {
  redraw();
  updateLiveStats();
  updateLegend();
}

// Canvas-only redraw — used inside the animation loop where stats/legend are
// unchanged. Avoids tearing down legend DOM 60×/sec during animation.
function redraw() {
  render(g_canvas, state.trajectories, previewTrajectory(), {
    showV:       state.showV,
    showVx:      state.showVx,
    showVy:      state.showVy,
    hoveredApex: state.hoveredApex,
  });
}

function updateLiveStats() {
  const a = projectileAnalytics(state.v0, state.angle, state.g, state.h0);
  document.getElementById('stat-tapex'  ).textContent = a.tApex.toFixed(2)   + ' s';
  document.getElementById('stat-hmax'   ).textContent = a.hMax.toFixed(2)    + ' m';
  document.getElementById('stat-tflight').textContent = a.tFlight.toFixed(2) + ' s';
  document.getElementById('stat-range'  ).textContent = a.range.toFixed(2)   + ' m';
}

function updateLegend() {
  const ul = document.getElementById('legend-list');
  ul.innerHTML = '';
  state.trajectories.forEach((tr, i) => {
    const li = document.createElement('li');
    li.className = 'legend-item';
    li.innerHTML = `
      <span class="legend-swatch" style="background:${tr.color}"></span>
      <span class="legend-params">
        v₀=${tr.params.v0} m/s, θ=${tr.params.angle}°, g=${tr.params.g} m/s², h₀=${tr.params.h0} m
      </span>
      <span class="legend-results">
        H=${tr.hMax.toFixed(1)} m, R=${tr.range.toFixed(1)} m, t=${tr.tFlight.toFixed(1)} s
      </span>
      <button class="legend-remove" data-idx="${i}" title="Remove">×</button>
    `;
    ul.appendChild(li);
  });
  ul.querySelectorAll('.legend-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx, 10);
      state.trajectories.splice(idx, 1);
      rerender();
    });
  });
}

function launch() {
  const tr = sampleTrajectory(state.v0, state.angle, state.g, state.h0);
  tr.color       = colorFor(state.nextColorIdx++);
  tr.params      = currentParams();
  tr.animElapsed = 0;
  state.trajectories.push(tr);
  if (!state.paused) startAnimLoop();
  rerender();
}

function togglePause() {
  state.paused = !state.paused;
  document.getElementById('btn-pause').textContent = state.paused ? 'Resume' : 'Pause';
  if (!state.paused) startAnimLoop();
  redraw();
}

// Advance every still-running trajectory by real elapsed time (1× real-time —
// dot's pixel-velocity = real velocity × world-to-pixel scale).
function startAnimLoop() {
  if (g_animRunning) return;
  g_animRunning  = true;
  g_animLastTime = null;
  requestAnimationFrame(animTick);
}

function animTick(timestamp) {
  if (!g_animRunning) return;
  if (state.paused)  { g_animRunning = false; return; }
  if (g_animLastTime === null) g_animLastTime = timestamp;
  const dt = (timestamp - g_animLastTime) / 1000;
  g_animLastTime = timestamp;

  let anyAnimating = false;
  for (const tr of state.trajectories) {
    if (tr.animElapsed < tr.tFlight) {
      tr.animElapsed = Math.min(tr.tFlight, tr.animElapsed + dt);
      if (tr.animElapsed < tr.tFlight) anyAnimating = true;
    }
  }

  redraw();

  if (anyAnimating) requestAnimationFrame(animTick);
  else              g_animRunning = false;
}

function clearAll() {
  state.trajectories = [];
  state.nextColorIdx = 0;
  rerender();
}

function initAll() {
  g_canvas = document.getElementById('canvas');
  new ResizeObserver(rerender).observe(g_canvas.parentElement);
  // Re-render on color-scheme changes (canvas colors depend on it).
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', rerender);
  }
  initHoverHandlers();
  rerender();
}

// Mouse hover handlers: highlight + tooltip on visible apex markers AND on the
// currently-displayed velocity vectors (v, vx, vy).
function initHoverHandlers() {
  const tip       = document.getElementById('apex-tooltip');
  const APEX_HIT  = 14;  // px
  const VEC_HIT   = 8;   // px (perpendicular distance to segment)

  g_canvas.addEventListener('mousemove', (e) => {
    const view = getLastView();
    if (!view) return;

    const r  = g_canvas.getBoundingClientRect();
    const mx = e.clientX - r.left;
    const my = e.clientY - r.top;

    const W = (x, y) => ({
      x: view.padL + (x - view.xMin) * view.sx,
      y: view.padT + view.plotH - (y - view.yMin) * view.sy,
    });

    let bestApexIdx  = -1;
    let bestApexDist = APEX_HIT;
    let bestVec      = null;  // { idx, type, dist, t }

    state.trajectories.forEach((tr, idx) => {
      const tNow = Math.max(0, Math.min(tr.tFlight, tr.animElapsed ?? tr.tFlight));

      // Apex hit-test.
      if (tr.tApex > 0 && tNow >= tr.tApex) {
        const a = W(tr.vx * tr.tApex, tr.hMax);
        const d = Math.hypot(mx - a.x, my - a.y);
        if (d < bestApexDist) { bestApexDist = d; bestApexIdx = idx; }
      }

      // Vector hit-tests at the current dot position.
      const dx = tr.vx * tNow;
      const dy = tr.params.h0 + tr.vy0 * tNow - 0.5 * tr.params.g * tNow * tNow;
      const vyNow = tr.vy0 - tr.params.g * tNow;
      const s = W(dx, dy);

      const tryVec = (visible, x2w, y2w, type) => {
        if (!visible) return;
        const e = W(x2w, y2w);
        const d = pointToSegmentDist(mx, my, s.x, s.y, e.x, e.y);
        if (d < VEC_HIT && (!bestVec || d < bestVec.dist)) {
          bestVec = { idx, type, dist: d, t: tNow };
        }
      };
      tryVec(state.showV,  dx + tr.vx, dy + vyNow, 'v');
      tryVec(state.showVx, dx + tr.vx, dy,         'vx');
      tryVec(state.showVy, dx,         dy + vyNow, 'vy');
    });

    const newHoveredApex = bestApexIdx >= 0 ? bestApexIdx : null;
    if (newHoveredApex !== state.hoveredApex) {
      state.hoveredApex = newHoveredApex;
      redraw();
    }

    // Apex takes priority — has more info — falls back to vector if no apex hit.
    if (bestApexIdx >= 0) {
      tip.innerHTML = apexTooltipHTML(state.trajectories[bestApexIdx]);
      showTip(tip, mx, my);
    } else if (bestVec) {
      tip.innerHTML = vectorTooltipHTML(state.trajectories[bestVec.idx], bestVec.t, bestVec.type);
      showTip(tip, mx, my);
    } else {
      tip.hidden = true;
    }
  });

  g_canvas.addEventListener('mouseleave', () => {
    if (state.hoveredApex !== null) {
      state.hoveredApex = null;
      redraw();
    }
    tip.hidden = true;
  });
}

function showTip(tip, mx, my) {
  tip.style.left = (mx + 14) + 'px';
  tip.style.top  = (my + 14) + 'px';
  tip.hidden     = false;
}

function apexTooltipHTML(tr) {
  return `
    <div class="tip-row"><span class="tip-key">Time to apex</span><span class="tip-val">${tr.tApex.toFixed(2)} s</span></div>
    <div class="tip-row"><span class="tip-key">Height</span><span class="tip-val">${tr.hMax.toFixed(2)} m</span></div>
    <div class="tip-row"><span class="tip-key">v<sub>x</sub></span><span class="tip-val">${tr.vx.toFixed(2)} m/s</span></div>
    <div class="tip-row"><span class="tip-key">v<sub>y</sub></span><span class="tip-val">0.00 m/s</span></div>
  `;
}

function vectorTooltipHTML(tr, t, type) {
  const vyNow = tr.vy0 - tr.params.g * t;
  const v     = Math.hypot(tr.vx, vyNow);
  if (type === 'v') {
    return `
      <div class="tip-row"><span class="tip-key">|v|</span><span class="tip-val">${v.toFixed(2)} m/s</span></div>
      <div class="tip-row"><span class="tip-key">v<sub>x</sub></span><span class="tip-val">${tr.vx.toFixed(2)} m/s</span></div>
      <div class="tip-row"><span class="tip-key">v<sub>y</sub></span><span class="tip-val">${vyNow.toFixed(2)} m/s</span></div>
      <div class="tip-row"><span class="tip-key">t</span><span class="tip-val">${t.toFixed(2)} s</span></div>
    `;
  }
  if (type === 'vx') {
    return `
      <div class="tip-row"><span class="tip-key">v<sub>x</sub></span><span class="tip-val">${tr.vx.toFixed(2)} m/s</span></div>
      <div class="tip-row"><span class="tip-key">t</span><span class="tip-val">${t.toFixed(2)} s</span></div>
    `;
  }
  // vy
  return `
    <div class="tip-row"><span class="tip-key">v<sub>y</sub></span><span class="tip-val">${vyNow.toFixed(2)} m/s</span></div>
    <div class="tip-row"><span class="tip-key">t</span><span class="tip-val">${t.toFixed(2)} s</span></div>
  `;
}

function pointToSegmentDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx*dx + dy*dy;
  if (len2 < 1) return Math.hypot(px - x1, py - y1);
  const u = Math.max(0, Math.min(1, ((px - x1)*dx + (py - y1)*dy) / len2));
  return Math.hypot(px - (x1 + u*dx), py - (y1 + u*dy));
}

window.state         = state;
window.launch        = launch;
window.clearAll      = clearAll;
window.rerender      = rerender;

window.addEventListener('load', initAll);
