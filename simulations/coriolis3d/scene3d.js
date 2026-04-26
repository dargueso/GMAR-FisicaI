// simulations/coriolis3d/scene3d.js

// ── Constants ────────────────────────────────────────────────────────────────

const SURFACE_RADIUS = 1.005; // particle sits just above surface
const TRAIL_MAX      = 8000;  // max trail points

// ── Helpers ──────────────────────────────────────────────────────────────────

function toV3(p) { return new THREE.Vector3(p.x, p.y, p.z); }

// ── Earth texture (schematic continents on canvas) ───────────────────────────

function buildEarthTexture() {
  const W = 2048, H = 1024;
  const cv  = document.createElement('canvas');
  cv.width  = W; cv.height = H;
  const ctx = cv.getContext('2d');

  function px(lon, lat) {
    return [((lon + 180) / 360) * W, ((90 - lat) / 180) * H];
  }

  function land(pts) {
    ctx.beginPath();
    ctx.moveTo(...px(pts[0][0], pts[0][1]));
    for (let i = 1; i < pts.length; i++) ctx.lineTo(...px(pts[i][0], pts[i][1]));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = '#0c1e30';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle   = '#3a6b30';
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth   = 1.2;

  // North America — Pacific coast, Gulf coast, Atlantic seaboard, Canada
  land([[-168,71],[-163,60],[-151,59],[-148,59],[-135,57],
        [-130,53],[-124,49],[-124,41],[-122,37],[-117,32],
        [-110,23],[-106,19],[-96,16],[-90,15],[-85,10],
        [-83,9],[-77,8],
        [-80,25],[-82,24],[-84,30],[-88,30],[-97,26],[-97,20],
        [-86,16],[-84,15],[-83,9],
        [-81,31],[-77,35],[-75,35],[-74,40],[-70,42],
        [-65,44],[-60,47],[-53,47],
        [-56,53],[-64,63],[-77,65],[-96,63],[-100,70],
        [-120,70],[-140,70]]);

  // Greenland
  land([[-58,76],[-44,82],[-20,83],[-18,77],[-25,71],[-42,65],[-52,68]]);

  // Iceland
  land([[-24,63],[-13,63],[-13,66],[-22,66],[-24,63]]);

  // South America — Caribbean coast, Amazon delta, southern tip
  land([[-77,8],[-63,11],[-62,11],[-52,4],[-49,0],
        [-48,-1],[-44,-3],[-38,-10],[-35,-9],[-35,-8],
        [-38,-16],[-40,-22],[-42,-23],[-48,-28],[-52,-33],
        [-56,-38],[-62,-50],[-68,-55],[-65,-55],
        [-65,-45],[-68,-38],[-66,-28],[-70,-18],[-76,-8],[-80,0]]);

  // Africa — N coast, Gulf of Guinea, E/S/W coasts
  land([[-17,14],[-17,21],[-14,28],[-10,31],[-6,36],
        [-2,35],[2,37],[10,38],[15,37],[22,37],[25,30],
        [32,31],[33,27],[37,22],
        [43,11],[51,12],[44,8],[41,2],[40,-6],[38,-11],
        [35,-20],[32,-29],[26,-34],[18,-34],[16,-28],
        [14,-17],[12,-5],[10,0],[5,1],[1,5],
        [-2,5],[-5,5],[-8,5],[-11,8],[-15,10]]);

  // Madagascar
  land([[44,-12],[50,-16],[50,-25],[44,-25],[43,-18],[44,-12]]);

  // Europe mainland — Mediterranean, Atlantic, Black Sea
  land([[-9,36],[-9,39],[-9,44],[-5,44],[-2,44],
        [2,50],[4,52],[5,58],
        [12,56],[18,60],[22,60],[28,59],[30,57],[30,54],
        [24,45],[28,38],[26,38],[22,38],[20,37],[15,37],
        [12,40],[10,44],[8,43],[4,44],[2,43],[-3,43]]);

  // Italian peninsula
  land([[12,44],[14,41],[16,38],[15,37],[12,38],[10,40],[10,44],[12,44]]);

  // Scandinavia
  land([[4,58],[5,62],[5,68],[15,71],[25,72],[28,71],
        [30,65],[28,57],[22,58],[18,59],[12,56],[8,57],[4,58]]);

  // Great Britain
  land([[-6,50],[-5,50],[-3,51],[0,52],[2,52],[0,55],
        [-1,57],[0,58],[-2,58],[-4,58],[-6,58],
        [-5,56],[-3,55],[-5,52],[-6,50]]);

  // Ireland
  land([[-10,51],[-8,52],[-6,55],[-8,56],[-10,54],[-10,51]]);

  // Asia — Russia, E Siberia, China, SE Asia coast
  land([[25,45],[30,55],[35,65],[30,70],[50,73],[75,73],
        [100,75],[135,73],[160,73],[180,70],
        [180,65],[167,65],[153,60],[145,60],[140,52],
        [143,46],[135,34],[130,32],[122,25],[115,22],
        [112,20],[108,18],[105,11],[102,3],
        [97,20],[88,23],[82,13],[78,8],[72,16],[68,22],
        [60,22],[55,22],[50,13],[43,11],[37,22],[30,31]]);

  // Arabian Peninsula
  land([[37,22],[43,11],[50,13],[56,24],[58,22],
        [58,15],[55,12],[45,13],[37,22]]);

  // Indian subcontinent
  land([[68,22],[72,22],[72,20],[70,16],[77,8],
        [80,10],[82,13],[88,22],[90,22],
        [88,27],[84,28],[80,28],[75,28],[72,22],[68,22]]);

  // Indochina / Malay peninsula
  land([[103,2],[100,4],[100,14],[102,22],[105,20],
        [108,16],[104,10],[102,13],[100,3],[103,2]]);

  // Japan — main islands (Honshu + Kyushu + Hokkaido approximate)
  land([[130,31],[131,33],[136,35],[140,36],[140,41],
        [141,43],[143,44],[143,43],[142,40],
        [141,38],[140,36],[137,35],[135,34],[130,31]]);

  // New Guinea
  land([[131,-2],[140,-6],[149,-6],[148,-9],[141,-9],[132,-6],[131,-2]]);

  // Australia — Gulf of Carpentaria, east coast, south coast
  land([[114,-22],[116,-20],[121,-18],[128,-14],
        [132,-12],[136,-12],[130,-12],[136,-12],
        [138,-14],[140,-12],[142,-10],[145,-15],
        [148,-20],[150,-22],[152,-26],[152,-30],
        [151,-34],[148,-38],[144,-38],[140,-36],
        [136,-34],[130,-33],[124,-28],[119,-25],[114,-22]]);

  // Antarctica
  land([[-180,-70],[180,-70],[180,-90],[-180,-90]]);

  const texture = new THREE.CanvasTexture(cv);

  // Async: fetch Natural Earth 110m land (much more accurate than the sketch above).
  // Falls back silently to the sketch if offline or CDN unreachable.
  function _ring(coords) {
    if (!coords.length) return;
    ctx.moveTo(...px(coords[0][0], coords[0][1]));
    let prevLon = coords[0][0];
    for (let i = 1; i < coords.length; i++) {
      const [lon, lat] = coords[i];
      // Antimeridian crossing: lift the pen instead of drawing a line across
      // the entire canvas, which would invert the fill on that polygon half.
      if (Math.abs(lon - prevLon) > 180) ctx.moveTo(...px(lon, lat));
      else                               ctx.lineTo(...px(lon, lat));
      prevLon = lon;
    }
  }
  function _geom(geom) {
    if (!geom) return;
    // evenodd is winding-direction-agnostic, so the y-axis flip from geographic
    // to canvas coordinates never inverts which side of a ring gets filled.
    if (geom.type === 'Polygon') {
      ctx.beginPath(); geom.coordinates.forEach(_ring); ctx.fill('evenodd'); ctx.stroke();
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates.forEach(poly => { ctx.beginPath(); poly.forEach(_ring); ctx.fill('evenodd'); ctx.stroke(); });
    }
  }
  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json')
    .then(r => r.json())
    .then(topo => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#0c1e30'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#3a6b30'; ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1.2;
      const feat = topojson.feature(topo, topo.objects.land);
      (feat.type === 'FeatureCollection' ? feat.features.map(f => f.geometry) : [feat.geometry])
        .forEach(_geom);
      texture.needsUpdate = true;
      if (typeof renderFrame3D === 'function') renderFrame3D();
    })
    .catch(() => { /* keep sketch fallback */ });

  return texture;
}

// ── Axis markers: pole crosshairs + equator ring ──────────────────────────────

function _buildAxisMarkers(parent) {
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  const R   = 0.005;  // cylinder radius
  const ARM = 0.22;   // cross-arm half-length
  const PIN = 0.26;   // outward-stick length

  function cyl(len) { return new THREE.CylinderGeometry(R, R, len, 8); }

  [1, -1].forEach(sign => {
    const stick = new THREE.Mesh(cyl(PIN), mat);
    stick.position.y = sign * (1 + PIN / 2);
    parent.add(stick);

    const armX = new THREE.Mesh(cyl(ARM * 2), mat);
    armX.rotation.z = Math.PI / 2;
    armX.position.y = sign * 1.003;
    parent.add(armX);

    const armZ = new THREE.Mesh(cyl(ARM * 2), mat);
    armZ.rotation.x = Math.PI / 2;
    armZ.position.y = sign * 1.003;
    parent.add(armZ);
  });

  const torusGeo = new THREE.TorusGeometry(1.015, R * 0.8, 8, 180);
  const torus    = new THREE.Mesh(torusGeo, new THREE.MeshBasicMaterial({
    color: 0xffffff, transparent: true, opacity: 0.75,
  }));
  torus.rotation.x = Math.PI / 2;
  parent.add(torus);
}

// ── Scene initialisation ─────────────────────────────────────────────────────

function initScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
  renderer.setClearColor(0x0f1117);

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100);
  camera.position.set(0, 0.4, 3);
  camera.lookAt(0, 0, 0);

  const earthGroup = new THREE.Group();
  scene.add(earthGroup);

  const earthGeo = new THREE.SphereGeometry(1, 64, 64);
  const earthMat = new THREE.MeshPhongMaterial({
    map:       buildEarthTexture(),
    specular:  new THREE.Color(0x111111),
    shininess: 8,
  });
  const earthMesh = new THREE.Mesh(earthGeo, earthMat);
  earthGroup.add(earthMesh);

  const atmGeo = new THREE.SphereGeometry(1.025, 32, 32);
  const atmMat = new THREE.MeshBasicMaterial({
    color: 0x1a6699, transparent: true, opacity: 0.15, side: THREE.BackSide,
  });
  earthGroup.add(new THREE.Mesh(atmGeo, atmMat));

  earthGroup.add(_buildGraticule());
  _buildAxisMarkers(earthGroup);

  // Sun stays fixed in inertial space
  const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
  sunLight.position.set(5, 3, 5);
  scene.add(sunLight);
  scene.add(new THREE.AmbientLight(0xffffff, 0.15));

  function onResize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(onResize).observe(canvas.parentElement);
  onResize();

  return { renderer, scene, camera, earthGroup, earthMesh };
}

// ── Graticule builder ─────────────────────────────────────────────────────────

function _buildGraticule() {
  const segs = [];
  const N = 90;

  function pushSeg(ax, ay, az, bx, by, bz) {
    segs.push(ax, ay, az, bx, by, bz);
  }

  for (let latDeg = -60; latDeg <= 60; latDeg += 30) {
    const φ = latDeg * Math.PI / 180;
    for (let i = 0; i < N; i++) {
      const λ0 = (i / N) * 2 * Math.PI;
      const λ1 = ((i + 1) / N) * 2 * Math.PI;
      pushSeg(
        Math.cos(φ)*Math.cos(λ0), Math.sin(φ), -Math.cos(φ)*Math.sin(λ0),
        Math.cos(φ)*Math.cos(λ1), Math.sin(φ), -Math.cos(φ)*Math.sin(λ1)
      );
    }
  }

  for (let lonDeg = 0; lonDeg < 360; lonDeg += 30) {
    const λ = lonDeg * Math.PI / 180;
    for (let i = 0; i < N; i++) {
      const φ0 = (-90 + (i / N) * 180) * Math.PI / 180;
      const φ1 = (-90 + ((i + 1) / N) * 180) * Math.PI / 180;
      pushSeg(
        Math.cos(φ0)*Math.cos(λ), Math.sin(φ0), -Math.cos(φ0)*Math.sin(λ),
        Math.cos(φ1)*Math.cos(λ), Math.sin(φ1), -Math.cos(φ1)*Math.sin(λ)
      );
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(segs, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08 });
  return new THREE.LineSegments(geo, mat);
}

// ── Builders ──────────────────────────────────────────────────────────────────

function buildParticle(scene) {
  const partGeo  = new THREE.SphereGeometry(0.022, 16, 16);
  const partMat  = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const partMesh = new THREE.Mesh(partGeo, partMat);
  scene.add(partMesh);

  const partGlow = new THREE.PointLight(0xffffff, 0.4, 0.6);
  scene.add(partGlow);

  return { partMesh, partGlow };
}

function buildTrail(scene) {
  const trailBuf  = new Float32Array(TRAIL_MAX * 3);
  const trailGeo  = new THREE.BufferGeometry();
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailBuf, 3));
  trailGeo.setDrawRange(0, 0);
  const trailMat  = new THREE.LineBasicMaterial({ color: 0xf0a500, depthTest: true, depthWrite: false });
  const trailLine = new THREE.Line(trailGeo, trailMat);
  trailLine.renderOrder = 1;
  scene.add(trailLine);
  return { trailLine, trailBuf };
}

// Single line-arrow (shaft + 2 head wings = 3 line segments, 6 endpoints).
function buildArrow(scene, color) {
  const buf  = new Float32Array(6 * 3);
  const geo  = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(buf, 3));
  geo.setDrawRange(0, 6);
  const mat  = new THREE.LineBasicMaterial({
    color, depthTest: false, depthWrite: false, transparent: true, opacity: 0.92,
  });
  const mesh = new THREE.LineSegments(geo, mat);
  mesh.renderOrder = 999;
  scene.add(mesh);
  return { mesh, buf, geo };
}

function buildCrosshair(scene) {
  const pts = new Float32Array([
    -0.05, 0, 0,  0.05, 0, 0,
     0, -0.05, 0,  0, 0.05, 0,
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  const mat = new THREE.LineBasicMaterial({ color: 0xffffff, opacity: 0.7, transparent: true });
  const crosshairLine = new THREE.LineSegments(geo, mat);
  scene.add(crosshairLine);
  return crosshairLine;
}

// ── Per-frame update functions ────────────────────────────────────────────────

// pos is the inertial world unit vector — place particle directly.
function updateParticle(partMesh, partGlow, pos) {
  const r = SURFACE_RADIUS;
  partMesh.position.set(pos.x * r, pos.y * r, pos.z * r);
  partGlow.position.set(pos.x * r, pos.y * r, pos.z * r);
}

// Track the start location on Earth's rotating surface.
// initPos is Earth-fixed at t=0; rotateY by earthAngle gives current world position.
function updateCrosshair(crosshairLine, initPos, earthAngle) {
  if (!initPos) return;
  const wp = toV3(rotateY(initPos, earthAngle));
  crosshairLine.position.copy(wp);
  const up = new THREE.Vector3(0, 1, 0);
  if (wp.dot(up) > -0.9999) {
    crosshairLine.quaternion.setFromUnitVectors(up, wp);
  } else {
    crosshairLine.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
  }
}

// Trail points — two modes:
//   'space': inertial world positions, copied directly.
//   'earth': Earth-fixed positions, rotated by earthAngle to follow the globe.
function updateTrail(trailLine, trailBuf, trailIn, trailEF, trailMode, earthAngle) {
  const earthSurface = (trailMode === 'earth');
  const trail = earthSurface ? trailEF : trailIn;
  const count = Math.min(trail.length, TRAIL_MAX);

  if (earthSurface) {
    const c = Math.cos(earthAngle), s = Math.sin(earthAngle);
    for (let i = 0; i < count; i++) {
      const p = trail[i];
      trailBuf[i*3]   = ( p.x*c + p.z*s) * SURFACE_RADIUS;
      trailBuf[i*3+1] =   p.y             * SURFACE_RADIUS;
      trailBuf[i*3+2] = (-p.x*s + p.z*c) * SURFACE_RADIUS;
    }
  } else {
    for (let i = 0; i < count; i++) {
      const p = trail[i];
      trailBuf[i*3]   = p.x * SURFACE_RADIUS;
      trailBuf[i*3+1] = p.y * SURFACE_RADIUS;
      trailBuf[i*3+2] = p.z * SURFACE_RADIUS;
    }
  }

  trailLine.geometry.attributes.position.needsUpdate = true;
  trailLine.geometry.setDrawRange(0, count);
}

// Velocity arrow — pos and vel are inertial world coords.
function updateArrow(arrowObj, pos, vel, camera) {
  if (!pos || !vel) { arrowObj.mesh.visible = false; return; }
  const speed = mag3(vel);
  if (speed < 0.1) { arrowObj.mesh.visible = false; return; }

  // Hide when particle is on the far side of Earth from the camera.
  // A surface point at unit vector p is occluded when dot(cameraDir, p) < 1/r,
  // where r is camera distance (exact tangent-line condition).
  const r = camera.position.length();
  const cx = camera.position.x / r, cy = camera.position.y / r, cz = camera.position.z / r;
  if (cx*pos.x + cy*pos.y + cz*pos.z < 1 / r) {
    arrowObj.mesh.visible = false;
    return;
  }

  const origin = new THREE.Vector3(pos.x, pos.y, pos.z).multiplyScalar(SURFACE_RADIUS);
  const d      = new THREE.Vector3(vel.x, vel.y, vel.z).normalize();
  const length = Math.max(0.03, Math.min(0.08, speed / 3000));
  const tip      = origin.clone().addScaledVector(d, length);
  const headLen  = length * 0.32;
  const headBase = tip.clone().addScaledVector(d, -headLen);

  let perp = new THREE.Vector3().crossVectors(d, origin.clone().sub(camera.position));
  if (perp.lengthSq() < 1e-12) {
    perp.crossVectors(d, Math.abs(d.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0));
  }
  perp.normalize().multiplyScalar(headLen * 0.42);

  const b = arrowObj.buf;
  b[0]=origin.x;           b[1]=origin.y;           b[2]=origin.z;
  b[3]=tip.x;              b[4]=tip.y;              b[5]=tip.z;
  b[6]=tip.x;              b[7]=tip.y;              b[8]=tip.z;
  b[9] =headBase.x+perp.x; b[10]=headBase.y+perp.y; b[11]=headBase.z+perp.z;
  b[12]=tip.x;             b[13]=tip.y;             b[14]=tip.z;
  b[15]=headBase.x-perp.x; b[16]=headBase.y-perp.y; b[17]=headBase.z-perp.z;
  arrowObj.geo.attributes.position.needsUpdate = true;
  arrowObj.mesh.visible = true;
}
