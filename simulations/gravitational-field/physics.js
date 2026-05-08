// campo_gravitatorio/physics.js

const G = 6.674e-11;

const PLANETS = [
  { name: 'Tierra',   M: 5.972e24, R: 6.371e6 },
  { name: 'Luna',     M: 7.342e22, R: 1.737e6 },
  { name: 'Marte',    M: 6.417e23, R: 3.390e6 },
  { name: 'Venus',    M: 4.867e24, R: 6.051e6 },
  { name: 'Mercurio', M: 3.301e23, R: 2.440e6 },
  { name: 'Júpiter',  M: 1.898e27, R: 6.991e7 },
  { name: 'Saturno',  M: 5.683e26, R: 5.823e7 },
  { name: 'Urano',    M: 8.681e25, R: 2.536e7 },
  { name: 'Neptuno',  M: 1.024e26, R: 2.462e7 },
  { name: 'Sol',      M: 1.989e30, R: 6.957e8 },
];

// Gravitational field magnitude (m/s²): zero at center, linear inside, 1/r² outside
function gravField(r, M, R) {
  if (r <= 0) return 0;
  if (r <= R) return (G * M / (R * R * R)) * r;
  return G * M / (r * r);
}

// Gravitational potential (J/kg), negative everywhere, continuous at r=R
function gravPotential(r, M, R) {
  if (r <= 0) return -1.5 * G * M / R;
  if (r <= R) return -G * M * (3 * R * R - r * r) / (2 * R * R * R);
  return -G * M / r;
}

// Sample both functions from r=0 to r=X_MAX_R * R
function sampleGravity(M, R, nSamples = 600) {
  const xMax = X_MAX_R * R;
  const pts  = [];
  for (let i = 0; i <= nSamples; i++) {
    const r = (i / nSamples) * xMax;
    pts.push({ r, g: gravField(r, M, R), V: gravPotential(r, M, R) });
  }
  return pts;
}
