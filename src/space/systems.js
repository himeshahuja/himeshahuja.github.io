import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { astar, bfsGrid, buildGraph, rng } from './graph.js';
import { SignalPoints } from './galaxy.js';

// Each project is a small world built from what the project does. Every
// builder returns { group, radius, update(t, dt) }; t is seconds, and a
// reduced-motion visit passes one fixed t.

const ICE = '#9fe8ff';
const AMBER = '#ffb23f';
const RED = '#ff5d5d';

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const easeOut = (p) => 1 - Math.pow(1 - clamp(p), 3);
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.15, ...extra });
const glow = (color) => new THREE.MeshBasicMaterial({ color, toneMapped: false });

function atmosphere(radius, color, strength = 0.9) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 48, 32),
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uStrength: { value: strength } },
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uStrength; varying vec3 vN; varying vec3 vV;
        void main() { float f = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(uColor, f * uStrength); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    }),
  );
}

// Map Pathfinder: a planet wrapped in roads, with A* racing between two cities.
export function mapWorld() {
  const group = new THREE.Group();
  const R = 2.1;
  group.add(new THREE.Mesh(new THREE.SphereGeometry(R, 64, 48), std('#0b1c25', { roughness: 0.85 })));
  group.add(atmosphere(R * 1.08, '#4fc3dc', 1.1));

  const N = 480, rand = rng(5);
  const pts = new Float32Array(N * 3);
  const v = new THREE.Vector3();
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - ((i + 0.5) / N) * 2, rr = Math.sqrt(1 - y * y), th = i * golden;
    v.set(Math.cos(th) * rr + (rand() - 0.5) * 0.09, y + (rand() - 0.5) * 0.09, Math.sin(th) * rr + (rand() - 0.5) * 0.09);
    v.setLength(R * 1.004).toArray(pts, i * 3);
  }
  const graph = buildGraph(pts, 4, 0.5);

  // Points along the surface between two cities, so roads hug the globe.
  const arc = (a, b, steps, lift, out) => {
    const A = new THREE.Vector3().fromArray(pts, a * 3), B = new THREE.Vector3().fromArray(pts, b * 3);
    for (let s = 0; s <= steps; s++) out.push(...A.clone().lerp(B, s / steps).setLength(R * lift).toArray());
  };
  const roads = [];
  for (let e = 0; e < graph.edges.length; e += 2) {
    const seg = [];
    arc(graph.edges[e], graph.edges[e + 1], 3, 1.004, seg);
    for (let s = 0; s < seg.length - 3; s += 3) roads.push(...seg.slice(s, s + 6));
  }
  group.add(new LineSegments2(
    new LineSegmentsGeometry().setPositions(roads),
    new LineMaterial({ color: '#2f6f7e', linewidth: 1.1, transparent: true, opacity: 0.95 }),
  ));
  const cities = new SignalPoints(pts, { size: 0.07, idle: '#5aa6b6', seen: ICE, path: AMBER, idleAlpha: 0.75, near: 0.4 });
  group.add(cities);

  const routeMat = new LineMaterial({ color: AMBER, linewidth: 3.2 });
  let route = null, segs = 0, cycle = -1;
  const P = 6.5;
  const plan = (k) => {
    const r = rng(k * 13 + 3);
    let s, t;
    for (;;) {
      s = (r() * N) | 0; t = (r() * N) | 0;
      const d = pts[s * 3] * pts[t * 3] + pts[s * 3 + 1] * pts[t * 3 + 1] + pts[s * 3 + 2] * pts[t * 3 + 2];
      if (d < -0.25 * R * R) break;
    }
    const res = astar(graph, s, t);
    cities.clear();
    const step = 1.6 / res.explored.length;
    cities.mark(res.explored, 1, 0.3, step);
    cities.mark(res.path, 2, 1.9, 0.6 / res.path.length);
    const line = [];
    for (let i = 0; i < res.path.length - 1; i++) {
      const seg = [];
      arc(res.path[i], res.path[i + 1], 4, 1.014, seg);
      line.push(...(i ? seg.slice(3) : seg));
    }
    if (route) { group.remove(route); route.geometry.dispose(); }
    route = new Line2(new LineGeometry().setPositions(line), routeMat);
    segs = line.length / 3 - 1;
    group.add(route);
  };

  return {
    group, radius: 2.6,
    update(t) {
      group.rotation.y = t * 0.07;
      const k = Math.floor(t / P), tau = t - k * P;
      if (k !== cycle) { cycle = k; plan(k); }
      cities.material.uniforms.uTime.value = tau;
      route.geometry.instanceCount = Math.floor(easeOut((tau - 1.9) / 0.9) * segs);
    },
  };
}

// Raft: five servers on a ring. The leader sends heartbeats; every term it
// crashes, a follower times out, asks for votes and takes over.
export function raftWorld() {
  const group = new THREE.Group();
  const ring = 2.25;
  group.add(new THREE.Mesh(new THREE.TorusGeometry(ring, 0.014, 8, 200), glow('#24525c')).rotateX(Math.PI / 2));

  const nodes = [], home = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.36, 40, 28), std(ICE, { emissive: ICE, emissiveIntensity: 0.3, roughness: 0.35 }));
    home.push(new THREE.Vector3(Math.cos(a) * ring, 0, Math.sin(a) * ring));
    m.position.copy(home[i]);
    nodes.push(m);
    group.add(m);
  }
  const halo = atmosphere(0.62, AMBER, 1.4);
  group.add(halo);

  // The replicated log, a stack of entries at the centre.
  const LOG = 9;
  const log = new THREE.InstancedMesh(new RoundedBoxGeometry(0.62, 0.07, 0.62, 2, 0.02), std('#6f8f99', { emissive: '#2a6f80', emissiveIntensity: 0.35, roughness: 0.35, metalness: 0.4 }), LOG);
  group.add(log);

  const packets = new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 12, 8), glow('#ffffff'), 24);
  group.add(packets);

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3();
  const cAmber = new THREE.Color(AMBER).multiplyScalar(1.6), cIce = new THREE.Color(ICE).multiplyScalar(1.4);
  const colLead = new THREE.Color(AMBER), colFollow = new THREE.Color(ICE), colDown = new THREE.Color('#29333a');
  const P = 9;

  return {
    group, radius: 2.9,
    update(t) {
      group.rotation.y = t * 0.06;
      const k = Math.floor(t / P), tau = t - k * P;
      const L = (k * 2) % 5, C = (k * 2 + 2) % 5, prevL = (((k - 1) * 2) % 5 + 5) % 5;
      const leader = tau < 6 ? L : tau >= 8 ? C : -1;
      const down = tau >= 6 ? L : k > 0 && tau < 0.8 ? prevL : -1;
      const cand = tau >= 7.2 && tau < 8 ? C : -1;

      nodes.forEach((n, i) => {
        n.position.copy(home[i]).setY(Math.sin(t * 1.3 + i * 1.7) * 0.07);
        const mat = n.material;
        let sc = 1;
        if (i === down) { mat.color.copy(colDown); mat.emissive.copy(colDown); mat.emissiveIntensity = 0; sc = 0.74; }
        else if (i === leader) { mat.color.copy(colLead); mat.emissive.copy(colLead); mat.emissiveIntensity = 1.1; sc = 1.3; }
        else { mat.color.copy(colFollow); mat.emissive.copy(colFollow); mat.emissiveIntensity = i === cand ? 0.5 + 0.7 * Math.abs(Math.sin(t * 9)) : 0.28; }
        n.scale.setScalar(sc);
      });
      if (leader >= 0) { halo.visible = true; halo.position.copy(nodes[leader].position); } else halo.visible = false;

      let m = 0;
      const send = (from, to, p, col) => {
        if (p < 0 || p > 1 || m >= 24) return;
        const a = nodes[from].position, b = nodes[to].position;
        p3.copy(a).lerp(b, p).multiplyScalar(1 - Math.sin(p * Math.PI) * 0.35);
        p3.y += Math.sin(p * Math.PI) * 0.5;
        packets.setMatrixAt(m, m4.compose(p3, q, s3.setScalar(1)));
        packets.setColorAt(m, col);
        m++;
      };
      if (leader >= 0) {
        const t0 = leader === L ? 0 : 8;
        const j = Math.floor((tau - t0) / 0.75);
        for (const jj of [j - 1, j]) {
          if (jj < 0) continue;
          for (let i = 0; i < 5; i++) if (i !== leader && i !== down) send(leader, i, (tau - t0 - jj * 0.75) / 0.5, cAmber);
        }
      }
      if (tau >= 7.2 && tau < 7.6) for (let i = 0; i < 5; i++) if (i !== C && i !== L) send(C, i, (tau - 7.2) / 0.4, cIce);
      if (tau >= 7.6 && tau < 8) for (let i = 0; i < 5; i++) if (i !== C && i !== L) send(i, C, (tau - 7.6) / 0.4, cIce);
      packets.count = m;
      packets.instanceMatrix.needsUpdate = true;
      if (packets.instanceColor) packets.instanceColor.needsUpdate = true;

      const entries = 2 + (Math.floor(t / 1.5) % (LOG - 1));
      for (let i = 0; i < LOG; i++) {
        p3.set(0, -0.45 + i * 0.1, 0);
        log.setMatrixAt(i, m4.compose(p3, q, s3.setScalar(i < entries ? 1 : 0.0001)));
      }
      log.instanceMatrix.needsUpdate = true;
    },
  };
}

// AI Minesweeper: a floating board. The first click floods open, then the AI
// flags what it can prove is a mine and opens what it can prove is safe.
export function mineWorld() {
  const group = new THREE.Group();
  const N = 9, S = 0.48, half = ((N - 1) * S) / 2;
  const base = new THREE.Mesh(new RoundedBoxGeometry(N * S + 0.3, 0.14, N * S + 0.3, 2, 0.06), std('#0a1216'));
  base.position.y = -0.16;
  group.add(base);

  const tiles = new THREE.InstancedMesh(new RoundedBoxGeometry(0.43, 0.16, 0.43, 2, 0.035), std('#ffffff', { roughness: 0.5 }), N * N);
  group.add(tiles);
  const flags = new THREE.InstancedMesh(new THREE.ConeGeometry(0.11, 0.3, 14).translate(0, 0.15, 0), std(AMBER, { emissive: AMBER, emissiveIntensity: 1.2 }), 24);
  group.add(flags);

  const digitColours = ['#7cc4ff', '#5fe0a0', '#ff7a6b', '#ffd166', '#ff9d5c', '#5fd3e6', '#eaf4f3', '#9db2b6'];
  const digitMats = digitColours.map((c, i) => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const x = cv.getContext('2d');
    x.fillStyle = c;
    x.font = '800 96px Unbounded, "Arial Black", sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(String(i + 1), 64, 70);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false });
  });
  const digitGeo = new THREE.PlaneGeometry(0.36, 0.36).rotateX(-Math.PI / 2);
  let digits = [];

  const nbs = (c) => {
    const x = c % N, y = (c / N) | 0, out = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < N && ny < N) out.push(ny * N + nx);
    }
    return out;
  };

  let revealAt, flagAt, num, cycle = -1;
  const P = 10;
  const plan = (k) => {
    const r = rng(k * 31 + 7);
    const start = ((2 + r() * 5) | 0) * N + ((2 + r() * 5) | 0);
    const safe = new Set([start, ...nbs(start)]);
    const mine = new Uint8Array(N * N);
    for (let placed = 0; placed < 12;) {
      const c = (r() * N * N) | 0;
      if (!mine[c] && !safe.has(c)) { mine[c] = 1; placed++; }
    }
    num = new Uint8Array(N * N);
    for (let c = 0; c < N * N; c++) num[c] = nbs(c).filter((n) => mine[n]).length;
    revealAt = new Float32Array(N * N).fill(Infinity);
    flagAt = new Float32Array(N * N).fill(Infinity);
    let time = 0.6;
    const open = (c) => {
      const q = [c];
      while (q.length) {
        const v = q.shift();
        if (revealAt[v] < Infinity) continue;
        revealAt[v] = time; time += 0.022;
        if (num[v] === 0) for (const n of nbs(v)) if (revealAt[n] === Infinity && !mine[n]) q.push(n);
      }
    };
    open(start);
    for (let changed = true; changed;) {
      changed = false;
      for (let c = 0; c < N * N; c++) {
        if (revealAt[c] === Infinity || !num[c]) continue;
        const around = nbs(c);
        const hidden = around.filter((n) => revealAt[n] === Infinity && flagAt[n] === Infinity);
        const flagged = around.filter((n) => flagAt[n] < Infinity).length;
        if (!hidden.length) continue;
        if (hidden.length + flagged === num[c]) {
          for (const h of hidden) { flagAt[h] = time; time += 0.16; }
          changed = true;
        } else if (flagged === num[c]) {
          time += 0.12;
          for (const h of hidden) open(h);
          changed = true;
        }
      }
    }
    // Fit the whole game into the cycle.
    const end = Math.max(...[...revealAt, ...flagAt].filter((x) => x < Infinity));
    if (end > 7.4) {
      const f = 7.4 / end;
      for (let c = 0; c < N * N; c++) { revealAt[c] *= f; flagAt[c] *= f; }
    }
    for (const d of digits) group.remove(d);
    digits = [];
    for (let c = 0; c < N * N; c++) {
      if (!num[c] || revealAt[c] === Infinity) continue;
      const d = new THREE.Mesh(digitGeo, digitMats[num[c] - 1]);
      d.position.set((c % N) * S - half, 0.012, ((c / N) | 0) * S - half);
      d.userData.cell = c;
      digits.push(d);
      group.add(d);
    }
  };

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(1, 1, 1), p3 = new THREE.Vector3();
  const raised = new THREE.Color('#2e4652'), sunk = new THREE.Color('#0d171c'), col = new THREE.Color();

  return {
    group, radius: 3.0,
    update(t) {
      group.rotation.y = Math.sin(t * 0.18) * 0.35;
      const k = Math.floor(t / P), tau = t - k * P;
      if (k !== cycle) { cycle = k; plan(k); }
      let f = 0;
      for (let c = 0; c < N * N; c++) {
        const open = easeOut((tau - revealAt[c]) / 0.2);
        const x = (c % N) * S - half, z = ((c / N) | 0) * S - half;
        p3.set(x, -0.08 * open, z);
        tiles.setMatrixAt(c, m4.compose(p3, q, s3.set(1, 1 - open * 0.55, 1)));
        tiles.setColorAt(c, col.copy(raised).lerp(sunk, open));
        if (tau >= flagAt[c] && f < 24) {
          const pop = easeOut((tau - flagAt[c]) / 0.25);
          p3.set(x, 0.08, z);
          flags.setMatrixAt(f++, m4.compose(p3, q, s3.setScalar(pop)));
        }
      }
      flags.count = f;
      tiles.instanceMatrix.needsUpdate = true;
      tiles.instanceColor.needsUpdate = true;
      flags.instanceMatrix.needsUpdate = true;
      for (const d of digits) d.visible = tau >= revealAt[d.userData.cell] + 0.1;
    },
  };
}

// Load Balancer: requests fall into the balancer and fan out to six servers.
// One server is slow. Round robin piles work onto it; least connections drains it.
export function balancerWorld() {
  const group = new THREE.Group();
  const ring = 2.35, SERVERS = 6, SLOW = 2, CAP = 9;
  const hub = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), std('#e9fbff', { emissive: ICE, emissiveIntensity: 0.9, roughness: 0.2, flatShading: true }));
  group.add(hub);
  group.add(atmosphere(0.75, ICE, 1.0));

  const spots = [], strips = [];
  for (let i = 0; i < SERVERS; i++) {
    const a = (i / SERVERS) * Math.PI * 2 + Math.PI / 6;
    const pos = new THREE.Vector3(Math.cos(a) * ring, -0.3, Math.sin(a) * ring);
    spots.push(pos);
    const box = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.8, 0.62, 2, 0.06), std('#16242c', { roughness: 0.4, metalness: 0.5 }));
    box.position.copy(pos);
    box.lookAt(0, pos.y, 0);
    group.add(box);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.06, 0.02), glow(i === SLOW ? RED : ICE));
    strip.position.set(0, 0.2, 0.32);
    box.add(strip);
    strips.push(strip);
  }
  const queue = new THREE.InstancedMesh(new RoundedBoxGeometry(0.3, 0.13, 0.3, 1, 0.03), std('#ffffff', { roughness: 0.4 }), SERVERS * CAP);
  group.add(queue);
  const packets = new THREE.InstancedMesh(new THREE.SphereGeometry(0.065, 10, 8), glow('#ffffff'), 80);
  group.add(packets);

  const top = new THREE.Vector3(0, 3.1, 0);
  const sim = { time: 0, spawn: 0, rr: 0, flying: [], q: new Array(SERVERS).fill(0), work: new Array(SERVERS).fill(0) };
  const service = (i) => (i === SLOW ? 2.6 : 0.6);
  const step = (dt) => {
    sim.time += dt;
    sim.spawn -= dt;
    if (sim.spawn <= 0) { sim.spawn += 0.13; sim.flying.push({ t: 0, to: -1 }); }
    const leastConn = Math.floor(sim.time / 8) % 2 === 1;
    for (const f of sim.flying) {
      f.t += dt;
      if (f.to < 0 && f.t >= 0.4) {
        if (leastConn) {
          const load = sim.q.map((n, i) => n + sim.flying.filter((g) => g.to === i).length);
          f.to = load.indexOf(Math.min(...load));
        } else { f.to = sim.rr; sim.rr = (sim.rr + 1) % SERVERS; }
      }
    }
    sim.flying = sim.flying.filter((f) => {
      if (f.to >= 0 && f.t >= 0.85) { sim.q[f.to] = Math.min(CAP, sim.q[f.to] + 1); return false; }
      return true;
    });
    for (let i = 0; i < SERVERS; i++) {
      if (!sim.q[i]) { sim.work[i] = 0; continue; }
      sim.work[i] += dt / service(i);
      if (sim.work[i] >= 1) { sim.work[i] = 0; sim.q[i]--; }
    }
  };

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(1, 1, 1), p3 = new THREE.Vector3();
  const cIce = new THREE.Color(ICE).multiplyScalar(1.5), cAmber = new THREE.Color(AMBER).multiplyScalar(1.5);
  const qIce = new THREE.Color('#cfefff'), qRed = new THREE.Color(RED);
  let last = null;

  return {
    group, radius: 3.0,
    warm(seconds) { for (let s = 0; s < seconds; s += 0.05) step(0.05); },
    update(t) {
      const dt = last == null ? 0 : clamp(t - last, 0, 0.1);
      last = t;
      if (dt > 0) step(dt);
      hub.rotation.y = t * 0.8;
      hub.rotation.x = Math.sin(t * 0.6) * 0.3;
      group.rotation.y = t * 0.05;

      let m = 0;
      for (const f of sim.flying) {
        if (m >= 80) break;
        if (f.t < 0.4) p3.copy(top).lerp(hub.position, f.t / 0.4);
        else p3.copy(hub.position).lerp(spots[f.to], (f.t - 0.4) / 0.45).setY(p3.y + 0.35);
        packets.setMatrixAt(m, m4.compose(p3, q, s3.setScalar(1)));
        packets.setColorAt(m, f.t < 0.4 ? cIce : cAmber);
        m++;
      }
      packets.count = m;
      packets.instanceMatrix.needsUpdate = true;
      if (packets.instanceColor) packets.instanceColor.needsUpdate = true;

      let n = 0;
      for (let i = 0; i < SERVERS; i++) {
        for (let j = 0; j < CAP; j++) {
          p3.copy(spots[i]).setY(0.22 + j * 0.16);
          queue.setMatrixAt(n, m4.compose(p3, q, s3.setScalar(j < sim.q[i] ? 1 : 0.0001)));
          queue.setColorAt(n, i === SLOW ? qRed : qIce);
          n++;
        }
        strips[i].material.color.set(sim.q[i] > 5 ? RED : i === SLOW ? '#ff8a6b' : ICE);
      }
      queue.instanceMatrix.needsUpdate = true;
      queue.instanceColor.needsUpdate = true;
    },
  };
}

// Maze Solver: walls sink as depth-first search carves the maze, then BFS
// floods it and the shortest path lights up.
export function mazeWorld() {
  const group = new THREE.Group();
  const N = 11, S = 0.42, half = (N * S) / 2, H = 0.26;
  const base = new THREE.Mesh(new RoundedBoxGeometry(N * S + 0.36, 0.14, N * S + 0.36, 2, 0.06), std('#0a1216'));
  base.position.y = -0.08;
  group.add(base);

  // Horizontal walls first ((N + 1) rows of N), then vertical (N rows of N + 1).
  const HW = (N + 1) * N, WALLS = HW + N * (N + 1);
  const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), std('#2a5260', { emissive: '#0e3340', emissiveIntensity: 0.6, roughness: 0.4 }), WALLS);
  group.add(walls);
  const floor = new THREE.InstancedMesh(new THREE.PlaneGeometry(S * 0.9, S * 0.9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ toneMapped: false }), N * N);
  group.add(floor);

  const hWall = (r, c) => r * N + c; // above cell row r
  const vWall = (r, c) => HW + r * (N + 1) + c; // left of cell column c
  const between = (a, b) => {
    const ax = a % N, ay = (a / N) | 0, bx = b % N, by = (b / N) | 0;
    if (ay === by) return vWall(ay, Math.max(ax, bx));
    return hWall(Math.max(ay, by), ax);
  };

  let removeAt, seenAt, pathAt, cycle = -1;
  const P = 8;
  const plan = (k) => {
    const r = rng(k * 17 + 11);
    removeAt = new Float32Array(WALLS).fill(Infinity);
    removeAt[hWall(0, 0)] = 0.25;
    removeAt[hWall(N, N - 1)] = 0.25;
    const seen = new Uint8Array(N * N);
    const stack = [0];
    seen[0] = 1;
    let order = 0;
    while (stack.length) {
      const v = stack[stack.length - 1];
      const x = v % N, y = (v / N) | 0;
      const options = [];
      if (x > 0 && !seen[v - 1]) options.push(v - 1);
      if (x < N - 1 && !seen[v + 1]) options.push(v + 1);
      if (y > 0 && !seen[v - N]) options.push(v - N);
      if (y < N - 1 && !seen[v + N]) options.push(v + N);
      if (!options.length) { stack.pop(); continue; }
      const nxt = options[(r() * options.length) | 0];
      removeAt[between(v, nxt)] = 0.35 + order++ * (1.5 / (N * N));
      seen[nxt] = 1;
      stack.push(nxt);
    }
    const res = bfsGrid(N, N, 0, N * N - 1, (a, b) => removeAt[between(a, b)] < Infinity);
    seenAt = new Float32Array(N * N).fill(Infinity);
    pathAt = new Float32Array(N * N).fill(Infinity);
    res.order.forEach((c, i) => { seenAt[c] = 2.1 + i * (1.5 / res.order.length); });
    res.path.forEach((c, i) => { pathAt[c] = 3.8 + i * (0.9 / res.path.length); });
  };

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p3 = new THREE.Vector3();
  const cBase = new THREE.Color('#0f1c22'), cSeen = new THREE.Color('#1f6b7c'), cFlash = new THREE.Color(ICE), cPath = new THREE.Color(AMBER).multiplyScalar(1.3), col = new THREE.Color();

  return {
    group, radius: 3.1,
    update(t) {
      group.rotation.y = t * 0.06;
      const k = Math.floor(t / P), tau = t - k * P;
      if (k !== cycle) { cycle = k; plan(k); }
      const rise = easeOut(tau / 0.3);
      for (let w = 0; w < WALLS; w++) {
        const h = H * rise * (1 - easeOut((tau - removeAt[w]) / 0.22));
        if (w < HW) {
          const r = (w / N) | 0, c = w % N;
          p3.set(c * S - half + S / 2, h / 2, r * S - half);
          s3.set(S + 0.05, Math.max(h, 0.0001), 0.05);
        } else {
          const v = w - HW, r = (v / (N + 1)) | 0, c = v % (N + 1);
          p3.set(c * S - half, h / 2, r * S - half + S / 2);
          s3.set(0.05, Math.max(h, 0.0001), S + 0.05);
        }
        walls.setMatrixAt(w, m4.compose(p3, q, s3));
      }
      walls.instanceMatrix.needsUpdate = true;
      for (let c = 0; c < N * N; c++) {
        p3.set((c % N) * S - half + S / 2, 0.002, ((c / N) | 0) * S - half + S / 2);
        floor.setMatrixAt(c, m4.compose(p3, q, s3.set(1, 1, 1)));
        col.copy(cBase);
        if (tau >= seenAt[c]) col.copy(cSeen).lerp(cFlash, Math.exp(-(tau - seenAt[c]) * 4));
        if (tau >= pathAt[c]) col.copy(cPath);
        floor.setColorAt(c, col);
      }
      floor.instanceMatrix.needsUpdate = true;
      floor.instanceColor.needsUpdate = true;
    },
  };
}

// Rubik's Cube: 27 cubies that keep turning, one layer at a time.
export function cubeWorld({ still = false } = {}) {
  const group = new THREE.Group();
  const cube = new THREE.Group();
  group.add(cube);
  const SP = 0.86;
  const body = new RoundedBoxGeometry(0.82, 0.82, 0.82, 3, 0.09);
  const plastic = std('#0b0f12', { roughness: 0.35, metalness: 0.1 });
  const sticker = new THREE.ShapeGeometry((() => {
    const s = new THREE.Shape(), w = 0.33, r = 0.08;
    s.moveTo(-w + r, -w); s.lineTo(w - r, -w); s.quadraticCurveTo(w, -w, w, -w + r);
    s.lineTo(w, w - r); s.quadraticCurveTo(w, w, w - r, w); s.lineTo(-w + r, w);
    s.quadraticCurveTo(-w, w, -w, w - r); s.lineTo(-w, -w + r); s.quadraticCurveTo(-w, -w, -w + r, -w);
    return s;
  })(), 4);
  const faces = [
    ['x', 1, '#e8483f', [0, Math.PI / 2, 0]], ['x', -1, '#ff8a2a', [0, -Math.PI / 2, 0]],
    ['y', 1, '#f2f6f5', [-Math.PI / 2, 0, 0]], ['y', -1, '#ffd23f', [Math.PI / 2, 0, 0]],
    ['z', 1, '#2f7bf0', [0, 0, 0]], ['z', -1, '#23b26d', [0, Math.PI, 0]],
  ].map(([axis, sign, c, rot]) => ({ axis, sign, rot, mat: std(c, { roughness: 0.3, emissive: c, emissiveIntensity: 0.12 }) }));

  const cubies = [];
  for (let x = -1; x <= 1; x++) for (let y = -1; y <= 1; y++) for (let z = -1; z <= 1; z++) {
    const c = new THREE.Group();
    c.add(new THREE.Mesh(body, plastic));
    const at = { x, y, z };
    for (const f of faces) {
      if (at[f.axis] !== f.sign) continue;
      const s = new THREE.Mesh(sticker, f.mat);
      s.rotation.set(...f.rot);
      s.position[f.axis] = f.sign * 0.413;
      c.add(s);
    }
    c.position.set(x * SP, y * SP, z * SP);
    cube.add(c);
    cubies.push(c);
  }

  const pivot = new THREE.Group();
  cube.add(pivot);
  const rand = rng(23);
  const mtx = new THREE.Matrix4();
  let move = null, nextAt = 0.4, prev = null;
  const DUR = 0.36;
  const pickMove = () => {
    for (;;) {
      const m = { axis: 'xyz'[(rand() * 3) | 0], layer: ((rand() * 3) | 0) - 1, dir: rand() < 0.5 ? 1 : -1 };
      if (!prev || prev.axis !== m.axis || prev.layer !== m.layer || prev.dir === m.dir) return m;
    }
  };
  const begin = (t) => {
    move = { ...pickMove(), t0: t, members: [] };
    for (const c of cubies) if (Math.round(c.position[move.axis] / SP) === move.layer) move.members.push(c);
    for (const c of move.members) pivot.attach(c);
  };
  const finish = () => {
    pivot.rotation[move.axis] = (move.dir * Math.PI) / 2;
    pivot.updateMatrixWorld();
    for (const c of move.members) {
      cube.attach(c);
      c.position.set(Math.round(c.position.x / SP) * SP, Math.round(c.position.y / SP) * SP, Math.round(c.position.z / SP) * SP);
      mtx.makeRotationFromQuaternion(c.quaternion);
      for (let i = 0; i < 16; i++) mtx.elements[i] = Math.round(mtx.elements[i]);
      c.quaternion.setFromRotationMatrix(mtx);
    }
    pivot.rotation.set(0, 0, 0);
    prev = move;
    move = null;
  };
  if (still) for (let i = 0; i < 14; i++) { begin(0); finish(); }

  return {
    group, radius: 2.5,
    update(t) {
      group.rotation.set(0.42, t * 0.22 + 0.6, 0.12);
      if (still) return;
      if (!move && t >= nextAt) begin(t);
      if (move) {
        const p = clamp((t - move.t0) / DUR);
        pivot.rotation.set(0, 0, 0);
        pivot.rotation[move.axis] = (move.dir * Math.PI * easeInOut(p)) / 2;
        if (p >= 1) { finish(); nextAt = t + 0.12; }
      }
    },
  };
}

// Net Worth: a padlock that takes a six-digit password, opens, and locks again,
// circled by coins.
export function lockWorld() {
  const group = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: '#e3b259', metalness: 1, roughness: 0.26 });
  const steel = new THREE.MeshStandardMaterial({ color: '#d4dde0', metalness: 1, roughness: 0.18 });
  const lock = new THREE.Group();
  lock.position.y = -0.2;
  group.add(lock);

  const body = new THREE.Mesh(new RoundedBoxGeometry(1.8, 1.4, 0.72, 4, 0.18), gold);
  lock.add(body);
  const hole = glow('#130c03');
  const keyhole = new THREE.Mesh(new THREE.CircleGeometry(0.13, 32), hole);
  keyhole.position.set(0, -0.2, 0.362);
  lock.add(keyhole);
  const slot = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.3), hole);
  slot.position.set(0, -0.38, 0.362);
  lock.add(slot);

  const dots = [];
  for (let i = 0; i < 6; i++) {
    const d = new THREE.Mesh(new THREE.CircleGeometry(0.055, 20), glow('#3a2a10'));
    d.position.set(-0.5 + i * 0.2, 0.32, 0.362);
    lock.add(d);
    dots.push(d);
  }

  // The shackle swings about its left leg.
  const shackle = new THREE.Group();
  shackle.position.set(-0.52, 0.7, 0);
  lock.add(shackle);
  const arc = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.12, 20, 56, Math.PI), steel);
  arc.position.set(0.52, 0.42, 0);
  shackle.add(arc);
  for (const x of [0, 1.04]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.62, 24), steel);
    leg.position.set(x, 0.11, 0);
    shackle.add(leg);
  }

  const COINS = 18;
  const coins = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.25, 0.055, 36), gold, COINS);
  group.add(coins);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s3 = new THREE.Vector3(1, 1, 1), p3 = new THREE.Vector3();
  const tilt = new THREE.Vector3(1, 0, 0);
  const off = new THREE.Color('#3a2a10'), on = new THREE.Color(AMBER).multiplyScalar(1.8);
  const P = 7;

  return {
    group, radius: 2.8,
    update(t) {
      const tau = t % P;
      lock.rotation.y = Math.sin(t * 0.4) * 0.45;
      dots.forEach((d, i) => d.material.color.copy(tau >= 0.6 + i * 0.28 && tau < 5.8 ? on : off));
      const lift = easeInOut(clamp((tau - 2.5) / 0.3)) - easeInOut(clamp((tau - 5.4) / 0.3));
      const swing = easeInOut(clamp((tau - 2.8) / 0.4)) - easeInOut(clamp((tau - 5.0) / 0.4));
      shackle.position.y = 0.7 + lift * 0.42;
      shackle.rotation.y = -swing * 2.1;

      for (let i = 0; i < COINS; i++) {
        const a = (i / COINS) * Math.PI * 2 + t * 0.35;
        p3.set(Math.cos(a) * 2.35, Math.sin(a * 2 + 1) * 0.22, Math.sin(a) * 2.35).applyAxisAngle(tilt, 0.32);
        q.setFromEuler(e.set(Math.PI / 2 + Math.sin(t + i) * 0.4, t * 1.6 + i, 0));
        coins.setMatrixAt(i, m4.compose(p3, q, s3));
      }
      coins.instanceMatrix.needsUpdate = true;
    },
  };
}


// Where every route ends: a black hole with a hot accretion disk, the lensed
// image of the disk's far side wrapped around it, and a thin photon ring.
const HEAT = /* glsl */ `
  vec3 heat(float t) {
    vec3 a = vec3(1.0, 0.95, 0.86), b = vec3(1.0, 0.68, 0.24), c = vec3(0.95, 0.32, 0.09), d = vec3(0.32, 0.06, 0.03);
    return t < 0.22 ? mix(a, b, t / 0.22) : t < 0.6 ? mix(b, c, (t - 0.22) / 0.38) : mix(c, d, (t - 0.6) / 0.4);
  }
`;
const ORBIT = /* glsl */ `
  uniform float uTime, uScale, uMax, uIn, uOut;
  attribute float aR, aA, aH, aSeed, aSize;
  varying vec3 vColor;
  varying float vAlpha;
  // Matter drifts inward and wraps back to the rim; inner orbits run faster.
  float orbitR() { return uIn + mod(aR - uIn - uTime * 0.12 * (0.5 + aSeed), uOut - uIn); }
  float orbitA(float r) { return aA + uTime * 2.2 * pow(r, -1.5); }
  void finish(vec4 mv, float bright, float t) {
    gl_Position = projectionMatrix * mv;
    vColor = heat(t) * bright;
    vAlpha = smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.7, 1.0, t));
    float px = aSize * uScale / max(-mv.z, 0.01);
    if (px < 1.2) { vAlpha *= px / 1.2; px = 1.2; }
    gl_PointSize = min(px, uMax);
  }
`;
const DISK_VERT = HEAT + ORBIT + /* glsl */ `
  void main() {
    float r = orbitR(), a = orbitA(r), t = (r - uIn) / (uOut - uIn);
    vec4 mv = modelViewMatrix * vec4(cos(a) * r, aH * r, sin(a) * r, 1.0);
    // The side turning toward the camera is brighter.
    vec3 vel = normalize(normalMatrix * vec3(-sin(a), 0.0, cos(a)));
    finish(mv, pow(1.0 + 0.6 * vel.z, 3.0) * pow(1.2 - t, 2.0) * 0.5, t);
  }
`;
const LENS_VERT = HEAT + ORBIT + /* glsl */ `
  uniform float uRing;
  void main() {
    float r = orbitR(), a = orbitA(r), t = (r - uIn) / (uOut - uIn);
    vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
    float rr = uRing + (r - uIn) * 0.2;
    vec4 mv = vec4(c.xyz + vec3(cos(a) * rr, sin(a) * rr * 0.92, -0.4), 1.0);
    finish(mv, (0.2 + 0.8 * abs(sin(a))) * pow(1.2 - t, 2.0) * 0.55, t);
  }
`;
const DOT_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    gl_FragColor = vec4(vColor, (exp(-d * d * 7.0) + exp(-d * d * 2.0) * 0.3) * vAlpha);
  }
`;

export function blackHoleWorld() {
  const group = new THREE.Group();
  const tilt = new THREE.Group();
  tilt.rotation.set(0.36, 0, -0.1);
  group.add(tilt);
  const RH = 1.5, IN = 2.5, OUT = 7.2;

  tilt.add(new THREE.Mesh(new THREE.SphereGeometry(RH, 64, 48), new THREE.MeshBasicMaterial({ color: '#000000' })));

  const N = 48000, rand = rng(77);
  const g = new THREE.BufferGeometry();
  const attr = { aR: [], aA: [], aH: [], aSeed: [], aSize: [] };
  for (let i = 0; i < N; i++) {
    const u = rand();
    attr.aR.push(IN + Math.pow(u, 1.9) * (OUT - IN));
    attr.aA.push(rand() * Math.PI * 2);
    attr.aH.push((rand() + rand() + rand() - 1.5) * 0.022);
    attr.aSeed.push(rand());
    attr.aSize.push(0.035 + Math.pow(rand(), 3) * 0.09);
  }
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  for (const [k, v] of Object.entries(attr)) g.setAttribute(k, new THREE.BufferAttribute(new Float32Array(v), 1));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), OUT + 1);

  const uniforms = { uTime: { value: 0 }, uScale: { value: 400 }, uMax: { value: 5 }, uIn: { value: IN }, uOut: { value: OUT } };
  const shared = { fragmentShader: DOT_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending };
  const disk = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms, vertexShader: DISK_VERT, ...shared }));
  disk.material.userData = { maxPx: 5 };
  tilt.add(disk);
  const lens = new THREE.Points(g, new THREE.ShaderMaterial({ uniforms: { ...uniforms, uRing: { value: RH * 1.22 } }, vertexShader: LENS_VERT, ...shared }));
  lens.material.userData = { maxPx: 4 };
  lens.frustumCulled = false;
  tilt.add(lens);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(RH * 1.02, RH * 1.06, 160),
    new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd9a0').multiplyScalar(1.3), toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  group.add(ring);
  const q = new THREE.Quaternion();

  return {
    group, radius: 6.4,
    update(t, dt, camera) {
      uniforms.uTime.value = t;
      if (camera) ring.quaternion.copy(group.getWorldQuaternion(q).invert().multiply(camera.quaternion));
    },
  };
}

export const WORLDS = [mapWorld, raftWorld, mineWorld, balancerWorld, mazeWorld, cubeWorld, lockWorld];
