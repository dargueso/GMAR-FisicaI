// simulations/lunar-missions/missions.js
//
// Scripted trajectories of Apollo and Artemis missions in the Earth–Moon
// rotating frame (Earth at the origin, Moon fixed at (1, 0)). Each mission
// is parameterised by a small set of shape values; trajectoryPos() turns
// them into an (x, y) position for any normalised time t ∈ [0, 1].
//
// This is *not* a high-fidelity orbital mechanics model — it is a teaching
// visualisation intended to make the qualitative differences between
// mission profiles visible: a tight low orbit (Apollo 11) vs. a single
// free-return slingshot (Apollo 13) vs. a large Distant Retrograde Orbit
// (Artemis I).

const PATH_SAMPLES = 240;

const MISSIONS = [
  // ── Apollo (warm palette, chronological) ───────────────────────────────
  { id: 'apollo8',  name: 'Apollo 8',   program: 'Apollo',  year: '1968',
    color: '#ffd166', description: 'First crewed lunar orbit',
    duration: 6.1,  type: 'orbit', loops: 10, loopR: 0.045, outboundArc: 0.10 },
  { id: 'apollo11', name: 'Apollo 11',  program: 'Apollo',  year: '1969',
    color: '#ff9966', description: 'First lunar landing — Sea of Tranquility',
    duration: 8.1,  type: 'orbit', loops: 30, loopR: 0.050, outboundArc: 0.13 },
  { id: 'apollo12', name: 'Apollo 12',  program: 'Apollo',  year: '1969',
    color: '#f7b733', description: 'Second landing — Ocean of Storms',
    duration: 10.2, type: 'orbit', loops: 45, loopR: 0.048, outboundArc: 0.11 },
  { id: 'apollo13', name: 'Apollo 13',  program: 'Apollo',  year: '1970',
    color: '#ff6b6b', description: 'Aborted — free return',
    duration: 5.9,  type: 'flyby', loopR: 0.07,             outboundArc: 0.18 },
  { id: 'apollo14', name: 'Apollo 14',  program: 'Apollo',  year: '1971',
    color: '#ff7e54', description: 'Third landing — Fra Mauro',
    duration: 9.0,  type: 'orbit', loops: 34, loopR: 0.046, outboundArc: 0.14 },
  { id: 'apollo15', name: 'Apollo 15',  program: 'Apollo',  year: '1971',
    color: '#ffce5c', description: 'Hadley–Apennine — first lunar rover',
    duration: 12.3, type: 'orbit', loops: 74, loopR: 0.044, outboundArc: 0.15 },
  { id: 'apollo16', name: 'Apollo 16',  program: 'Apollo',  year: '1972',
    color: '#e8853d', description: 'Descartes Highlands',
    duration: 11.1, type: 'orbit', loops: 64, loopR: 0.046, outboundArc: 0.17 },
  { id: 'apollo17', name: 'Apollo 17',  program: 'Apollo',  year: '1972',
    color: '#ffaa44', description: 'Last Apollo landing — Taurus–Littrow',
    duration: 12.6, type: 'orbit', loops: 75, loopR: 0.045, outboundArc: 0.19 },

  // ── Artemis (cool palette) ─────────────────────────────────────────────
  { id: 'artemis1', name: 'Artemis I',  program: 'Artemis', year: '2022',
    color: '#5fb3d4', description: 'Uncrewed Distant Retrograde Orbit',
    duration: 25.5, type: 'dro',  loopR: 0.20,              outboundArc: 0.25 },
  { id: 'artemis2', name: 'Artemis II', program: 'Artemis', year: '2026',
    color: '#88e08c', description: 'First crewed lunar flyby since Apollo',
    duration: 10.0, type: 'flyby', loopR: 0.08,             outboundArc: 0.20 },
  { id: 'artemis3', name: 'Artemis III', program: 'Artemis', year: '2027 (planned)',
    color: '#a78bfa', description: 'Crewed lunar landing',
    duration: 30.0, type: 'orbit', loops: 7,  loopR: 0.045, outboundArc: 0.14 },
];

function lerp(a, b, t) { return a + (b - a) * t; }

// Time fractions of (outbound | lunar phase | return) for each mission type.
function phaseFractions(m) {
  switch (m.type) {
    case 'flyby': return [0.45, 0.10, 0.45];   // mostly transit, brief swing
    case 'dro':   return [0.25, 0.50, 0.25];   // long DRO loop
    default:      return [0.30, 0.40, 0.30];   // standard orbit
  }
}

// (x, y) of the spacecraft at normalised mission time t ∈ [0, 1].
// 0 = lift-off, 1 = back at Earth.
function trajectoryPos(m, t) {
  if (t <= 0) return { x: 0, y: 0 };
  if (t >= 1) return { x: 0, y: 0 };

  const [outF, lunF] = phaseFractions(m);
  const retF = 1 - outF - lunF;
  const r    = m.loopR;            // entry/exit radius from Moon centre

  if (t < outF) {
    // Outbound: Earth (0,0) → left side of Moon (1 - r, 0), bulging up.
    const u = t / outF;
    return {
      x: lerp(0, 1 - r, u),
      y: Math.sin(u * Math.PI) * m.outboundArc,
    };
  }
  if (t < outF + lunF) {
    // Lunar phase: enter at angle π (left side), sweep `loops` orbits.
    const u = (t - outF) / lunF;
    let loops = m.loops != null ? m.loops : 1;
    let dir   = 1;
    if (m.type === 'dro')  { loops = 1; dir = -1; }   // retrograde
    if (m.type === 'flyby'){ loops = 1; }
    const angle = Math.PI + dir * u * loops * 2 * Math.PI;
    return {
      x: 1 + r * Math.cos(angle),
      y:     r * Math.sin(angle),
    };
  }
  // Return: left side of Moon → Earth, bulging down (mirror of outbound).
  const u = (t - outF - lunF) / retF;
  return {
    x: lerp(1 - r, 0, u),
    y: -Math.sin(u * Math.PI) * m.outboundArc,
  };
}

// Pre-sample each mission's path so the renderer can draw it as a polyline
// without recomputing per frame.
function precomputePaths() {
  for (const m of MISSIONS) {
    m.path = [];
    for (let i = 0; i <= PATH_SAMPLES; i++) {
      m.path.push(trajectoryPos(m, i / PATH_SAMPLES));
    }
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    MISSIONS, PATH_SAMPLES, trajectoryPos, phaseFractions, precomputePaths,
  };
}
