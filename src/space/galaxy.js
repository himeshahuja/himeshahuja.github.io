import * as THREE from 'three';
import { rng } from './graph.js';

export const GALAXY_R = 60;
// The bar the two main arms grow from, and how tightly they wind.
const BAR = 7;
const PITCH = Math.tan((19 * Math.PI) / 180);
export const armAngle = (r, arm) => Math.log(Math.max(r, BAR) / BAR) / PITCH + arm * Math.PI;

const gauss = (rand) => {
  const u = Math.max(rand(), 1e-9), v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
};

const COLOURS = {
  core: ['#ffe2b0', '#ffc98a', '#ffd9a6', '#fff1d6'],
  disk: ['#d8e6ff', '#bcd6ff', '#f1f5ff', '#ffe9cf', '#a9c9ff'],
  young: ['#8fbaff', '#a6d0ff', '#cfe4ff', '#7fb0ff'],
  hii: ['#ff6f91', '#ff8fa8', '#ff5d7e'],
  gasIn: ['#ffb070', '#ffc58a'],
  gasOut: ['#2f6fd0', '#3d86e0', '#4aa3dc', '#2f6fd0'],
};
const pick = (list, rand) => new THREE.Color(list[(rand() * list.length) | 0]);

const STAR_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  uniform float uTwinkle;
  uniform float uNear;
  uniform float uMax;
  attribute float aSize;
  attribute float aSeed;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float dist = max(-mv.z, 0.001);
    float px = aSize * uScale / dist;
    float tw = 1.0 + uTwinkle * 0.3 * sin(uTime * (0.8 + aSeed * 2.6) + aSeed * 61.0);
    vColor = aColor * tw;
    // Points closer than uNear fade out so the camera can pass through.
    vAlpha = smoothstep(uNear * 0.3, uNear, dist);
    if (px < 1.2) { vAlpha *= px / 1.2; px = 1.2; }
    gl_PointSize = min(px, uMax);
  }
`;

const STAR_FRAG = /* glsl */ `
  uniform float uSoft;
  uniform float uOpacity;
  uniform float uCore;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float core = exp(-d * d * 9.0) * uCore;
    float halo = exp(-d * d * 2.2) * uSoft;
    gl_FragColor = vec4(vColor, (core + halo) * vAlpha * uOpacity);
  }
`;

// maxPx caps a point's size in CSS pixels, so stars stay points up close.
export function starMaterial({ soft = 0.25, near = 2, blending = THREE.AdditiveBlending, opacity = 1, maxPx = 6, core = 1 } = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uScale: { value: 400 },
      uTwinkle: { value: 1 },
      uNear: { value: near },
      uMax: { value: maxPx },
      uSoft: { value: soft },
      uOpacity: { value: opacity },
      uCore: { value: core },
    },
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    transparent: true,
    depthWrite: false,
    blending,
  });
  m.userData = { maxPx, opacity };
  return m;
}

function pointsGeometry(count, fill) {
  const position = new Float32Array(count * 3);
  const colour = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const seed = new Float32Array(count);
  const p = new THREE.Vector3(), c = new THREE.Color();
  let n = 0;
  for (let i = 0; i < count; i++) {
    const s = fill(p, c);
    if (s == null) continue;
    p.toArray(position, n * 3);
    c.toArray(colour, n * 3);
    size[n] = s;
    seed[n] = Math.random();
    n++;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position.subarray(0, n * 3), 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(colour.subarray(0, n * 3), 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size.subarray(0, n), 1));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed.subarray(0, n), 1));
  return g;
}

// A point on (or between) the arms at radius r.
export function diskPoint(rand, p, R, arms, spread = 1) {
  const r = Math.min(-Math.log(1 - rand() * 0.985) * R * 0.3 + BAR * 0.6, R * 1.08);
  let theta;
  if (rand() < 0.78) {
    const arm = rand() < 0.84 ? (rand() < 0.5 ? 0 : 1) : (rand() < 0.5 ? 0.5 : 1.5);
    const width = (1.1 + r * 0.075) * spread;
    theta = armAngle(r, arm) + (gauss(rand) * width) / Math.max(r, 3);
  } else {
    theta = rand() * Math.PI * 2;
  }
  const h = gauss(rand) * (0.35 + r * 0.012) * (1.4 - r / (R * 1.4));
  p.set(Math.cos(theta) * r, h, Math.sin(theta) * r);
  return r;
}

// The galaxy: a barred spiral with a warm bulge, blue arms, pink star-forming
// knots and a haze of gas. `clear` holds points to keep empty.
export function buildGalaxy({ count = 140000, R = GALAXY_R, clear = [], seed = 7, scale = 1 } = {}) {
  const rand = rng(seed);
  const blocked = (p) => clear.some((c) => p.distanceToSquared(c) < c.r2);
  const group = new THREE.Group();

  const stars = pointsGeometry(count, (p, c) => {
    const roll = rand();
    let size;
    if (roll < 0.13) {
      // Bulge and bar.
      const r = Math.abs(gauss(rand)) * 4.2;
      const a = rand() * Math.PI * 2, b = Math.acos(2 * rand() - 1);
      p.set(Math.sin(b) * Math.cos(a) * r * 1.0, Math.cos(b) * r * 0.55, Math.sin(b) * Math.sin(a) * r * 0.75);
      if (rand() < 0.4) p.x += gauss(rand) * BAR * 0.6;
      c.copy(pick(COLOURS.core, rand)).multiplyScalar(0.5);
      size = 0.1 + rand() * 0.14;
    } else {
      const r = diskPoint(rand, p, R, 2);
      const t = r / R;
      c.copy(pick(t < 0.18 ? COLOURS.core : rand() < 0.42 ? COLOURS.young : COLOURS.disk, rand));
      if (t < 0.18) c.multiplyScalar(0.6);
      size = 0.08 + Math.pow(rand(), 3) * 0.3;
    }
    if (blocked(p)) return null;
    c.multiplyScalar(0.6 + rand() * 0.45);
    return size * scale;
  });
  const starMat = starMaterial({ soft: 0.15, near: 3, maxPx: 5 });
  const starPoints = new THREE.Points(stars, starMat);
  group.add(starPoints);

  // Star-forming knots strung along the arms.
  const knots = [];
  for (let i = 0; i < Math.round(count / 540); i++) {
    const p = new THREE.Vector3();
    diskPoint(rand, p, R, 2, 0.6);
    if (p.length() > BAR * 1.6) knots.push(p);
  }
  const knotGeo = pointsGeometry(knots.length * 26, (p, c) => {
    const k = knots[(rand() * knots.length) | 0];
    p.set(k.x + gauss(rand) * 0.7, k.y + gauss(rand) * 0.25, k.z + gauss(rand) * 0.7);
    if (blocked(p)) return null;
    c.copy(pick(rand() < 0.55 ? COLOURS.hii : COLOURS.young, rand)).multiplyScalar(0.8);
    return (0.12 + rand() * 0.26) * scale;
  });
  group.add(new THREE.Points(knotGeo, starMaterial({ soft: 0.45, near: 3, maxPx: 7 })));

  // Soft gas glow, big and faint.
  const gasCount = Math.round(count / 28);
  const gasGeo = pointsGeometry(gasCount, (p, c) => {
    if (rand() < 0.2) p.set(gauss(rand) * 4, gauss(rand) * 1.2, gauss(rand) * 3);
    else diskPoint(rand, p, R, 2, 0.8);
    const t = p.length() / R;
    c.copy(pick(t < 0.2 ? COLOURS.gasIn : COLOURS.gasOut, rand)).multiplyScalar((t < 0.2 ? 0.05 : 0.028) + rand() * 0.018);
    return (3.6 + rand() * 4.4) * scale;
  });
  const gasMat = starMaterial({ soft: 1, core: 0, near: 16, maxPx: 220 });
  gasMat.uniforms.uTwinkle.value = 0;
  group.add(new THREE.Points(gasGeo, gasMat));

  const materials = group.children.map((o) => o.material);
  return { group, materials };
}

// The far sky: a shell of distant stars and a few other galaxies.
export function buildSky({ count = 7000 } = {}) {
  const rand = rng(91);
  const group = new THREE.Group();
  const shell = pointsGeometry(count, (p, c) => {
    const a = rand() * Math.PI * 2, b = Math.acos(2 * rand() - 1);
    const r = 700 + rand() * 300;
    p.set(Math.sin(b) * Math.cos(a) * r, Math.cos(b) * r, Math.sin(b) * Math.sin(a) * r);
    c.copy(pick(['#ffffff', '#cfe0ff', '#ffe6c8', '#a9c6ff'], rand)).multiplyScalar(0.35 + Math.pow(rand(), 2) * 0.9);
    return 1.3 + Math.pow(rand(), 4) * 3.2;
  });
  const shellMat = starMaterial({ soft: 0.1, near: 1, maxPx: 4 });
  group.add(new THREE.Points(shell, shellMat));

  const far = [
    [-420, 160, -520, 0.4, 1.1], [520, -120, -380, 1.3, 2.2], [-260, -300, 520, 2.2, 0.6],
    [380, 260, 460, 0.9, 1.7], [-600, 40, 120, 2.8, 2.9],
  ];
  const materials = [shellMat];
  for (const [x, y, z, rx, ry] of far) {
    const { group: g, materials: m } = buildGalaxy({ count: 5000, R: 22, seed: (x * 7 + z) | 0, scale: 2.4 });
    g.position.set(x, y, z);
    g.rotation.set(rx, ry, 0);
    group.add(g);
    materials.push(...m);
  }
  return { group, materials };
}

// Points that light up as a search reaches them: cool as they are explored,
// amber when they are on the route.
const SIGNAL_VERT = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  uniform vec3 uIdle;
  uniform vec3 uSeen;
  uniform vec3 uPath;
  uniform float uIdleAlpha;
  uniform float uNear;
  uniform float uMax;
  attribute float aSize;
  attribute float aKind;
  attribute float aStamp;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    float t = uTime - aStamp;
    float on = step(0.0, t);
    vec3 col = uIdle;
    float a = uIdleAlpha;
    float size = aSize;
    if (aKind > 0.5 && aKind < 1.5) {
      float flash = exp(-t * 3.5);
      float glow = exp(-t * 0.45);
      col = mix(uIdle, uSeen, on * (0.4 + 0.6 * glow));
      a = mix(a, 0.45 + 0.55 * glow + flash, on);
      size *= 1.0 + on * (0.5 * glow + 1.8 * flash);
    } else if (aKind > 1.5) {
      float flash = exp(-t * 2.5);
      col = mix(uIdle, uPath, on);
      a = mix(a, 1.0, on);
      size *= 1.0 + on * (1.2 + 2.4 * flash);
    }
    float dist = max(-mv.z, 0.001);
    float px = size * uScale / dist;
    vColor = col;
    vAlpha = a * smoothstep(uNear * 0.3, uNear, dist);
    if (px < 1.5) { vAlpha *= px / 1.5; px = 1.5; }
    gl_PointSize = min(px, uMax);
  }
`;

export class SignalPoints extends THREE.Points {
  constructor(positions, { size = 0.3, idle = '#dfe9ff', seen = '#8fe3ff', path = '#ffb23f', idleAlpha = 0.85, near = 2, maxPx = 14 } = {}) {
    const n = positions.length / 3;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const sizes = new Float32Array(n);
    for (let i = 0; i < n; i++) sizes[i] = size * (0.7 + Math.random() * 0.6);
    g.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    g.setAttribute('aKind', new THREE.BufferAttribute(new Float32Array(n), 1));
    g.setAttribute('aStamp', new THREE.BufferAttribute(new Float32Array(n), 1));
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uScale: { value: 400 }, uNear: { value: near }, uMax: { value: maxPx },
        uIdle: { value: new THREE.Color(idle) }, uSeen: { value: new THREE.Color(seen) },
        uPath: { value: new THREE.Color(path) }, uIdleAlpha: { value: idleAlpha },
      },
      vertexShader: SIGNAL_VERT,
      fragmentShader: STAR_FRAG.replace('uniform float uSoft;', 'const float uSoft = 0.45;').replace('uniform float uOpacity;', 'const float uOpacity = 1.0;').replace('uniform float uCore;', 'const float uCore = 1.0;'),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    m.userData = { maxPx };
    super(g, m);
    this.touched = [];
  }

  clear() {
    const kind = this.geometry.attributes.aKind;
    for (const i of this.touched) kind.array[i] = 0;
    this.touched = [];
    kind.needsUpdate = true;
  }

  // Light `ids` one after another from `at`, `step` seconds apart.
  mark(ids, type, at, step) {
    const kind = this.geometry.attributes.aKind, stamp = this.geometry.attributes.aStamp;
    ids.forEach((id, k) => {
      kind.array[id] = type;
      stamp.array[id] = at + k * step;
      this.touched.push(id);
    });
    kind.needsUpdate = true;
    stamp.needsUpdate = true;
  }
}
