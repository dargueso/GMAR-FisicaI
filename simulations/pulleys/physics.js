// poleas/physics.js

const P_MAX_TRAVEL = 1.5;  // max displacement of each mass (m) before animation stops

// M=0 → massless pulley (T1=T2). M>0 → massive disk: I=½MR², T1≠T2.
function atwoodAnalytics(m1, m2, g, M = 0, R = 0) {
  const effMass = m1 + m2 + 0.5 * M;
  const a  = (m2 - m1) * g / effMass;
  const T1 = m1 * (g + a);   // tension on m1 side
  const T2 = m2 * (g - a);   // tension on m2 side
  const I  = 0.5 * M * R * R;
  return { a, T1, T2, W1: m1 * g, W2: m2 * g, I, M, R };
}

// d(t) = ½·a·t²  (+ means m2 moved down, m1 moved up)
// v(t) = a·t
function sampleAtwood(m1, m2, g, M = 0, R = 0, nSamples = 300) {
  const an = atwoodAnalytics(m1, m2, g, M, R);
  const { a } = an;

  if (Math.abs(a) < 1e-9) {
    return { points: [{ t: 0, d: 0, v: 0 }], tEnd: 0, ...an, m1, m2, g };
  }

  const tEnd = Math.sqrt(2 * P_MAX_TRAVEL / Math.abs(a));
  const pts  = [];

  for (let i = 0; i <= nSamples; i++) {
    const t = (i / nSamples) * tEnd;
    pts.push({ t, d: 0.5 * a * t * t, v: a * t });
  }

  return { points: pts, tEnd, ...an, m1, m2, g };
}
