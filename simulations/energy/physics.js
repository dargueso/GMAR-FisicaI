// energia/physics.js

// ─── PROJECTILE ──────────────────────────────────────────────────────────────

function energyAnalytics(v0, angleDeg, g, h0, mass) {
  const θ   = angleDeg * Math.PI / 180;
  const vx  = v0 * Math.cos(θ);
  const vy0 = v0 * Math.sin(θ);

  let tFlight = 0;
  if (g > 0) {
    const disc = vy0 * vy0 + 2 * g * h0;
    if (disc >= 0) tFlight = (vy0 + Math.sqrt(disc)) / g;
  }

  const Ec0    = 0.5 * mass * v0 * v0;
  const Ep0    = mass * g * h0;
  const Em     = Ec0 + Ep0;
  const tApex  = (g > 0 && vy0 > 0) ? vy0 / g : 0;
  const hApex  = h0 + (g > 0 ? (vy0 * vy0) / (2 * g) : 0);
  const EcApex = 0.5 * mass * vx * vx;
  const EpApex = mass * g * hApex;

  return { vx, vy0, tFlight, tApex, hApex, Ec0, Ep0, Em, EcApex, EpApex };
}

function sampleEnergies(v0, angleDeg, g, h0, mass, nSamples = 300) {
  const a   = energyAnalytics(v0, angleDeg, g, h0, mass);
  const pts = [];

  if (a.tFlight <= 0) {
    pts.push({ t: 0, x: 0, y: h0, Ec: a.Ec0, Ep: a.Ep0 });
    return { points: pts, ...a, tEnd: 0 };
  }

  for (let i = 0; i <= nSamples; i++) {
    const t  = (i / nSamples) * a.tFlight;
    const vy = a.vy0 - g * t;
    const x  = a.vx * t;
    const y  = h0 + a.vy0 * t - 0.5 * g * t * t;
    const Ec = 0.5 * mass * (a.vx * a.vx + vy * vy);
    const Ep = mass * g * y;
    pts.push({ t, x, y, Ec, Ep });
  }

  return { points: pts, ...a, tEnd: a.tFlight };
}

// ─── PENDULUM ────────────────────────────────────────────────────────────────

function pendulumAnalytics(m, L, theta0deg, g) {
  const theta0   = theta0deg * Math.PI / 180;
  const T_approx = 2 * Math.PI * Math.sqrt(L / g);
  const Em0      = m * g * L * (1 - Math.cos(theta0));
  return { theta0, T_approx, Em0, EcMax: Em0, EpMax: Em0 };
}

function samplePendulum(m, L, theta0deg, g, nPeriods = 2, nSamples = 600) {
  const { theta0, T_approx, Em0 } = pendulumAnalytics(m, L, theta0deg, g);

  if (theta0 <= 1e-9 || T_approx <= 0) {
    return {
      points: [{ t: 0, theta: 0, omega: 0, Ec: 0, Ep: 0 }],
      tEnd: 0, Em0, loop: true, T_approx, L, theta0, m, g,
    };
  }

  const tEnd = nPeriods * T_approx;
  const dt   = tEnd / nSamples;
  const pts  = [];

  let theta = theta0;
  let omega = 0;  // starts from rest at theta0

  const deriv = (th, om) => [om, -(g / L) * Math.sin(th)];

  for (let i = 0; i <= nSamples; i++) {
    const v  = omega * L;
    const Ec = 0.5 * m * v * v;
    const Ep = m * g * L * (1 - Math.cos(theta));
    pts.push({ t: i * dt, theta, omega, Ec, Ep });

    if (i < nSamples) {
      const [k1t, k1o] = deriv(theta, omega);
      const [k2t, k2o] = deriv(theta + 0.5*dt*k1t, omega + 0.5*dt*k1o);
      const [k3t, k3o] = deriv(theta + 0.5*dt*k2t, omega + 0.5*dt*k2o);
      const [k4t, k4o] = deriv(theta +    dt*k3t,   omega +    dt*k3o);
      theta += (dt / 6) * (k1t + 2*k2t + 2*k3t + k4t);
      omega += (dt / 6) * (k1o + 2*k2o + 2*k3o + k4o);
    }
  }

  return { points: pts, tEnd, Em0, loop: true, T_approx, L, theta0, m, g };
}

// ─── INCLINED PLANE ──────────────────────────────────────────────────────────

const SLOPE_M  = 4.0;   // slope length (m)
const BLK_HALF = 0.14;  // half of block side (m)
const S_MIN    = BLK_HALF + 0.01;   // minimum block centre position from bottom
const S_START  = 3.5;               // default starting position

function inclinedAnalytics(m, angleDeg, mu, g, s0) {
  const theta  = angleDeg * Math.PI / 180;
  const sinT   = Math.sin(theta);
  const cosT   = Math.cos(theta);
  const N      = m * g * cosT;
  const a      = g * (sinT - mu * cosT);   // net acceleration down-slope
  const sliding = a > 1e-9;

  const Ep0 = m * g * s0 * sinT;   // starts from rest → Ec0 = 0
  const Em0 = Ep0;

  const dist     = Math.max(0, s0 - S_MIN);
  const EcBottom = sliding ? m * a * dist : 0;   // = ½mv² at bottom
  const EpBottom = m * g * S_MIN * sinT;
  const tEnd     = sliding ? Math.sqrt(2 * dist / a) : 0;

  return { theta, sinT, cosT, N, a, sliding, Ep0, Em0, EcBottom, EpBottom, tEnd };
}

// Analytical sampling of Ec and Ep during a slide from rest at s0.
function sampleInclined(m, angleDeg, mu, g, s0, nSamples = 300) {
  const theta = angleDeg * Math.PI / 180;
  const sinT  = Math.sin(theta);
  const cosT  = Math.cos(theta);
  const a     = g * (sinT - mu * cosT);

  const Em0 = m * g * s0 * sinT;   // Ep0, Ec0 = 0

  if (a <= 1e-9) {
    return {
      points: [{ t: 0, s: s0, Ec: 0, Ep: Em0 }],
      tEnd: 0, Em0, isStatic: true, a: 0, s0, sinT, cosT,
    };
  }

  const dist = s0 - S_MIN;
  const tEnd = Math.sqrt(2 * dist / a);
  const pts  = [];

  for (let i = 0; i <= nSamples; i++) {
    const t  = (i / nSamples) * tEnd;
    const v  = a * t;
    const s  = s0 - 0.5 * a * t * t;
    const Ec = 0.5 * m * v * v;
    const Ep = m * g * s * sinT;
    pts.push({ t, s, v, Ec, Ep });
  }

  return { points: pts, tEnd, Em0, isStatic: false, a, s0, sinT, cosT };
}

// ─── SPRING–MASS (HOOKE) ─────────────────────────────────────────────────────

function springAnalytics(m, k, x0, mu, g) {
  const omega0  = Math.sqrt(k / m);
  const T0      = 2 * Math.PI / omega0;
  const Em0     = 0.5 * k * x0 * x0;
  const sliding = k * Math.abs(x0) > mu * m * g + 1e-9;
  return { omega0, T0, Em0, EcMax: Em0, sliding };
}

// Coulomb friction: half-period analytical approach.
// Each half: x(τ) = A·cos(ω·τ) + x_eq  (SHM about shifted equilibrium ±f/k).
// No friction: exact analytical SHM, loop=true.
function sampleSpring(m, k, x0, mu, g, nSamples = 600) {
  const omega0 = Math.sqrt(k / m);
  const T0     = 2 * Math.PI / omega0;
  const Em0    = 0.5 * k * x0 * x0;
  const f      = mu * m * g;

  if (mu < 1e-9) {
    const tEnd = 2 * T0;
    const pts  = [];
    for (let i = 0; i <= nSamples; i++) {
      const t  = i * tEnd / nSamples;
      const x  = x0 * Math.cos(omega0 * t);
      const v  = -x0 * omega0 * Math.sin(omega0 * t);
      pts.push({ t, x, v, Ec: 0.5*m*v*v, Ep: 0.5*k*x*x });
    }
    return { points: pts, tEnd, Em0, loop: true, T_approx: T0, x0, k, m, mu };
  }

  if (k * Math.abs(x0) <= f + 1e-9) {
    return {
      points: [{ t: 0, x: x0, v: 0, Ec: 0, Ep: Em0 }],
      tEnd: 0, Em0, loop: false, T_approx: T0, x0, k, m, mu,
    };
  }

  const HALF_T       = Math.PI / omega0;
  const PTS_PER_HALF = 60;
  const allPts       = [];
  let t_global = 0;
  let curX     = x0;
  let movLeft  = true;

  for (let half = 0; half < 200; half++) {
    if (Math.abs(k * curX) <= f + 1e-10) break;
    const x_eq = movLeft ? f / k : -f / k;
    const A    = curX - x_eq;
    for (let i = 0; i <= PTS_PER_HALF; i++) {
      const tau = (i / PTS_PER_HALF) * HALF_T;
      const xi  = A * Math.cos(omega0 * tau) + x_eq;
      const vi  = -A * omega0 * Math.sin(omega0 * tau);
      allPts.push({ t: t_global + tau, x: xi, v: vi, Ec: 0.5*m*vi*vi, Ep: 0.5*k*xi*xi });
    }
    curX     = -A + x_eq;
    t_global += HALF_T;
    movLeft  = !movLeft;
  }

  allPts.push({ t: t_global, x: curX, v: 0, Ec: 0, Ep: 0.5*k*curX*curX });
  const tStop = t_global;

  const pts = [];
  for (let i = 0; i <= nSamples; i++) {
    const t = i * tStop / nSamples;
    let lo = 0, hi = allPts.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (allPts[mid].t <= t) lo = mid; else hi = mid; }
    const a = allPts[lo], b = allPts[hi];
    const u = b.t > a.t ? (t - a.t) / (b.t - a.t) : 0;
    pts.push({ t, x: a.x+u*(b.x-a.x), v: a.v+u*(b.v-a.v), Ec: a.Ec+u*(b.Ec-a.Ec), Ep: a.Ep+u*(b.Ep-a.Ep) });
  }

  return { points: pts, tEnd: tStop, Em0, loop: false, T_approx: T0, x0, k, m, mu };
}
