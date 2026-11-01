import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { GALAXY_R, SignalPoints, armAngle, buildGalaxy, buildSky, diskPoint } from './galaxy.js';
import { astar, buildGraph, rng } from './graph.js';
import { WORLDS, blackHoleWorld } from './systems.js';

const FOV = 40;
const TAN = Math.tan((FOV / 2) * (Math.PI / 180));
const UP = new THREE.Vector3(0, 1, 0);
const AMBER = '#ffb23f';
// Where the seven worlds sit: along one arm, spiralling in toward the core.
const RADII = [50, 44, 38.5, 33.5, 28.5, 24, 19.5];
const CLEAR = 4.8;
// The end of the route: a black hole out beyond the galaxy's rim.
const END = new THREE.Vector3(0, 95, 280);

const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const smooth = (p) => { p = clamp(p); return p * p * p * (p * (p * 6 - 15) + 10); };
const easeOut = (p) => 1 - Math.pow(1 - clamp(p), 3);
const lerp = (a, b, t) => a + (b - a) * t;
const blend = (a, b, t) => ({
  pos: a.pos.clone().lerp(b.pos, t), look: a.look.clone().lerp(b.look, t),
  cx: lerp(a.cx, b.cx, t), cy: lerp(a.cy, b.cy, t), dim: lerp(a.dim ?? 1, b.dim ?? 1, t),
});

// The whole page's 3D layer: one fixed canvas whose camera is driven by the
// scroll position, from the galaxy overview through the seven worlds and out.
export default class Space {
  constructor(host, { reduced = false, onActive } = {}) {
    this.host = host;
    this.reduced = reduced;
    this.onActive = onActive;
    const small = Math.min(innerWidth, innerHeight) < 700;
    const weak = small || (navigator.hardwareConcurrency || 8) <= 4;
    this.pr = Math.min(devicePixelRatio || 1, weak ? 1.5 : 2);

    this.canvas = document.createElement('canvas');
    host.append(this.canvas);
    const renderer = (this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'high-performance' }));
    renderer.setClearColor('#04070a');
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;

    const scene = (this.scene = new THREE.Scene());
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.6;
    pmrem.dispose();

    const camera = (this.camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 4000));
    scene.add(camera);
    const key = new THREE.DirectionalLight('#ffffff', 2.6);
    key.position.set(-6, 7, 4);
    const rim = new THREE.DirectionalLight(AMBER, 1.6);
    rim.position.set(7, 3, -26);
    for (const l of [key, rim]) { camera.add(l); camera.add(l.target); l.target.position.set(0, 0, -10); }
    scene.add(new THREE.HemisphereLight('#bfe6ff', '#1a1208', 0.5));

    this.sky = buildSky({ count: weak ? 4000 : 7000 });
    this.sky.group.rotation.y = 0.7;
    scene.add(this.sky.group);

    const galaxy = (this.galaxy = new THREE.Group());
    galaxy.rotation.y = 0.5;
    scene.add(galaxy);
    this.sysLocal = RADII.map((r, i) => {
      const a = armAngle(r, 0) + (i % 2 ? 0.04 : -0.04);
      return new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
    });
    // Only the cores of the worlds are kept clear, so they leave no holes in the arm.
    const clear = this.sysLocal.map((p) => Object.assign(p.clone(), { r2: 2.2 * 2.2 }));
    const stars = buildGalaxy({ count: weak ? 70000 : 140000, clear });
    galaxy.add(stars.group);
    this.starMats = [...stars.materials, ...this.sky.materials];
    this.ownMats = stars.materials;
    if (reduced) for (const m of this.starMats) m.uniforms.uTwinkle.value = 0;

    // The navigable stars: the graph every route on the page runs across. The
    // seven worlds are its last seven nodes.
    const navN = (this.navN = weak ? 1400 : 2200);
    const W = navN + RADII.length;
    const navPos = new Float32Array(W * 3);
    const rand = rng(3), p = new THREE.Vector3();
    for (let i = 0; i < navN;) {
      diskPoint(rand, p, GALAXY_R, 2, 0.9);
      if (p.length() < 6 || this.sysLocal.some((s) => s.distanceTo(p) < CLEAR)) continue;
      p.toArray(navPos, i++ * 3);
    }
    this.sysLocal.forEach((s, i) => s.toArray(navPos, (navN + i) * 3));
    this.graph = buildGraph(navPos, 5, 4);
    this.nav = new SignalPoints(navPos, { size: 0.32, idle: '#e4eeff', seen: '#8fe3ff', path: AMBER, idleAlpha: 0.75, near: 3 });
    galaxy.add(this.nav);

    // The tour: A* from each world to the next. The camera flies these routes.
    const v3 = (id) => new THREE.Vector3().fromArray(navPos, id * 3);
    this.tour = [];
    const tourPts = [];
    for (let i = 0; i < RADII.length - 1; i++) {
      const res = astar(this.graph, navN + i, navN + i + 1);
      const pts = res.path.map(v3);
      // A softer copy of the route for the camera, so it banks instead of zigzagging.
      const soft = pts.map((q, k) => (k === 0 || k === pts.length - 1 ? q.clone() : q.clone().add(pts[k - 1]).add(pts[k + 1]).divideScalar(3)));
      this.tour.push({ curve: new THREE.CatmullRomCurve3(soft, false, 'centripetal') });
      const line = new THREE.CatmullRomCurve3(pts, false, 'centripetal').getPoints(pts.length * 6);
      tourPts.push(...(i ? line.slice(1) : line));
    }
    this.tourLine = new Line2(
      new LineGeometry().setPositions(tourPts.flatMap((q) => [q.x, q.y + 0.05, q.z])),
      new LineMaterial({ color: AMBER, linewidth: 1.6, transparent: true, opacity: 0, depthWrite: false }),
    );
    galaxy.add(this.tourLine);

    this.demo = new Line2(new LineGeometry().setPositions([0, 0, 0, 0, 0, 0]), new LineMaterial({ color: AMBER, linewidth: 2.6, transparent: true, depthWrite: false }));
    this.demo.visible = false;
    galaxy.add(this.demo);
    this.demoAt = 0;
    this.demoSegs = 0;

    this.worlds = WORLDS.map((make, i) => {
      const w = make({ still: reduced });
      w.group.position.copy(this.sysLocal[i]);
      galaxy.add(w.group);
      if (reduced && w.warm) w.warm(6);
      w.update(reduced ? 4.2 : 0, 0);
      return w;
    });

    this.hole = blackHoleWorld();
    this.hole.group.position.copy(END);
    scene.add(this.hole.group);
    this.hole.update(reduced ? 4.2 : 0, 0, camera);

    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.4, 0.65);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.time = 0;
    this.last = performance.now();
    this.cam = { pos: new THREE.Vector3(), look: new THREE.Vector3(), cx: 0.5, cy: 0.5, dim: 1, init: false };
    this.here = this.nearest(new THREE.Vector3(-14, 0, 22));
    this.nextAuto = 1.4;
    this.active = -1;
    this.frames = [];
    this.m = null;

    this.onResize = () => this.resize();
    addEventListener('resize', this.onResize);
    this.resize();
    if (reduced) this.autoRoute();
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  // The page elements the camera frames, measured again whenever layout changes.
  layout(anchors) {
    this.anchors = anchors;
    this.measure();
  }

  measure() {
    const a = this.anchors;
    if (!a) return;
    const sy = scrollY;
    const box = (el) => el.getBoundingClientRect();
    const stage = box(a.workStage), view = box(a.workView);
    this.m = {
      workTop: box(a.work).top + sy,
      step: a.workStage.offsetHeight,
      n: RADII.length,
      jobsTop: box(a.jobs).top + sy,
      schoolTop: box(a.school).top + sy,
      workRect: { x: view.left, y: view.top - stage.top, w: view.width, h: view.height },
    };
  }

  resize() {
    const W = (this.W = innerWidth), H = (this.H = innerHeight);
    this.renderer.setPixelRatio(this.pr);
    this.renderer.setSize(W, H, false);
    this.composer.setPixelRatio(this.pr);
    this.composer.setSize(W, H);
    this.camera.aspect = W / H;
    this.camera.updateProjectionMatrix();
    const scale = (H * this.pr) / (2 * TAN);
    this.scene.traverse((o) => {
      const u = o.material?.uniforms;
      if (u?.uScale) u.uScale.value = scale;
      if (u?.uMax) u.uMax.value = o.material.userData.maxPx * this.pr;
    });
    this.measure();
  }

  // How far away an object of `radius` must be to appear `px` pixels in radius.
  fit(radius, px) {
    return (radius * (this.H / 2)) / (px * TAN);
  }

  // The galaxy fills the hero; the name stands over its lower half.
  heroView() {
    const phone = this.W < 700;
    const px = phone ? this.W * 0.8 : Math.min(this.W * 0.42, this.H * 0.62);
    const d = this.fit(GALAXY_R, px);
    const el = phone ? 1.05 : 0.95;
    return {
      pos: new THREE.Vector3(0, Math.sin(el) * d, Math.cos(el) * d),
      look: new THREE.Vector3(),
      cx: 0.5,
      cy: phone ? 0.44 : 0.38,
    };
  }

  sysView(i) {
    const p = this.galaxy.localToWorld(this.sysLocal[i].clone());
    const radial = new THREE.Vector3(p.x, 0, p.z).normalize();
    const tangent = new THREE.Vector3(-radial.z, 0, radial.x);
    const az = i % 2 ? 0.55 : -0.55, el = 0.48;
    const dir = radial.multiplyScalar(Math.cos(az)).add(tangent.multiplyScalar(Math.sin(az)))
      .multiplyScalar(Math.cos(el)).addScaledVector(UP, Math.sin(el)).normalize();
    const r = this.m.workRect;
    const d = this.fit(this.worlds[i].radius, Math.min(r.w, r.h) * 0.36);
    return { pos: p.clone().addScaledVector(dir, d), look: p, cx: (r.x + r.w / 2) / this.W, cy: (r.y + r.h / 2) / this.H };
  }

  // Between two worlds the camera rides the A* route that joins them.
  ride(i, s) {
    const base = blend(this.sysView(i), this.sysView(i + 1), s);
    const c = this.tour[i].curve;
    const at = this.galaxy.localToWorld(c.getPointAt(clamp(s)).clone()).addScaledVector(UP, 4.5);
    const ahead = this.galaxy.localToWorld(c.getPointAt(clamp(s + 0.3)).clone());
    const w = Math.sin(Math.PI * s) ** 2;
    base.pos.lerp(at, w);
    base.look.lerp(ahead, w);
    base.cx = lerp(base.cx, 0.5, w * 0.8);
    base.cy = lerp(base.cy, 0.5, w * 0.8);
    return base;
  }

  // Edge-on and far away: the galaxy as one bright line under the experience.
  // It sits in the space left for it below the route and scrolls with it.
  outView(t) {
    const phone = this.W < 700;
    const az = 2.4 + t * 0.35, el = 0.075;
    const d = this.fit(GALAXY_R, this.W * (phone ? 0.62 : 0.42));
    const r = this.anchors.jobsView.getBoundingClientRect();
    return {
      pos: new THREE.Vector3(Math.sin(az) * Math.cos(el) * d, Math.sin(el) * d, Math.cos(az) * Math.cos(el) * d),
      look: new THREE.Vector3(),
      cx: 0.5,
      cy: clamp((r.top + r.height * 0.55) / this.H, -0.5, 2),
      dim: this.W < 1000 ? 0.6 : 0.8,
      pin: true,
    };
  }

  // The black hole follows its place on the page, so it scrolls with the words.
  endView() {
    const r = this.anchors.schoolView.getBoundingClientRect();
    const d = this.fit(this.hole.radius, Math.min(r.width, r.height) * 0.5);
    const dir = new THREE.Vector3(0.22, -0.08, 1).normalize();
    return {
      pos: END.clone().addScaledVector(dir, d), look: END.clone(),
      cx: (r.left + r.width / 2) / this.W, cy: (r.top + r.height / 2) / this.H, pin: true,
    };
  }

  evaluate(y) {
    const { workTop, step, n, jobsTop, schoolTop } = this.m;
    const R = this.reduced;
    const hero = this.heroView();
    if (y <= 0) return hero;
    if (y < workTop) return blend(hero, this.sysView(0), R ? +(y > workTop / 2) : smooth(y / workTop));
    const f = (y - workTop) / step;
    if (f <= n - 1) {
      const i = Math.min(Math.floor(f), n - 2), u = f - i;
      const s = R ? +(u >= 0.5) : smooth((u - 0.2) / 0.6);
      if (s <= 0) return this.sysView(i);
      if (s >= 1) return this.sysView(i + 1);
      return this.ride(i, s);
    }
    const workEnd = workTop + (n - 1) * step;
    const outAt = jobsTop - this.H * 0.2;
    const out = this.outView((y - outAt) / this.H);
    const endAt = schoolTop - this.H * 0.8;
    if (y > endAt) {
      const p = (y - endAt) / (this.H * 0.65);
      if (p >= 1) return this.endView();
      const v = blend(out, this.endView(), R ? +(p > 0.5) : smooth(p));
      v.cx = lerp(out.cx, v.cx, smooth(p * 1.4));
      return v;
    }
    if (y < outAt) return blend(this.sysView(n - 1), out, R ? +((y - workEnd) / (outAt - workEnd) > 0.5) : smooth((y - workEnd) / (outAt - workEnd)));
    return out;
  }

  nearest(world) {
    let best = 0, bd = Infinity;
    const pos = this.graph.pos;
    for (let i = 0; i < this.navN; i++) {
      const d = (pos[i * 3] - world.x) ** 2 + (pos[i * 3 + 1] - world.y) ** 2 + (pos[i * 3 + 2] - world.z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  // Send A* from the current star to `target`, lighting what it explores.
  route(target) {
    if (target === this.here) return;
    const res = astar(this.graph, this.here, target);
    if (!res.path.length) return;
    const t0 = this.reduced ? this.time - 60 : this.time;
    this.nav.clear();
    const step = Math.min(0.005, 1.1 / res.explored.length);
    this.nav.mark(res.explored, 1, t0, step);
    const tp = t0 + res.explored.length * step;
    this.nav.mark(res.path, 2, tp, 0.55 / res.path.length);

    const pts = res.path.map((id) => new THREE.Vector3().fromArray(this.graph.pos, id * 3));
    const line = pts.length > 1 ? new THREE.CatmullRomCurve3(pts, false, 'centripetal').getPoints(pts.length * 6) : [pts[0], pts[0]];
    this.demo.geometry.dispose();
    this.demo.geometry = new LineGeometry().setPositions(line.flatMap((q) => [q.x, q.y, q.z]));
    this.demo.visible = true;
    this.demoAt = tp;
    this.demoSegs = line.length - 1;
    this.here = target;
  }

  autoRoute() {
    const pos = this.graph.pos, h = this.here;
    for (let tries = 0; tries < 40; tries++) {
      const t = (Math.random() * this.navN) | 0;
      const d = Math.hypot(pos[t * 3] - pos[h * 3], pos[t * 3 + 2] - pos[h * 3 + 2]);
      if (d > 24 && d < 62) { this.route(t); break; }
    }
    this.nextAuto = this.time + 5.5;
  }

  // Clicks on the galaxy come in pairs: the first star is the start, the
  // second the destination.
  pick(x, y) {
    const v = new THREE.Vector3(), pos = this.graph.pos, mw = this.galaxy.matrixWorld;
    let best = -1, bd = 80 * 80;
    for (let i = 0; i < this.navN; i++) {
      v.fromArray(pos, i * 3).applyMatrix4(mw).project(this.camera);
      if (v.z > 1) continue;
      const sx = ((v.x + 1) / 2) * this.W, sy = ((1 - v.y) / 2) * this.H;
      const d = (sx - x) ** 2 + (sy - y) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    if (best < 0) return false;
    if (this.from == null) {
      this.from = best;
      this.nav.clear();
      this.nav.mark([best], 2, this.time, 0);
      this.demo.visible = false;
      this.nextAuto = this.time + 15;
    } else {
      this.here = this.from;
      this.from = null;
      this.route(best);
      this.nextAuto = this.time + 11;
    }
    return true;
  }

  loop(now) {
    this.raf = requestAnimationFrame(this.loop);
    if (!this.m) return;
    const dt = Math.min(0.05, (now - this.last) / 1000 || 0.016);
    this.last = now;
    if (!this.reduced) this.time += dt;

    const y = scrollY;
    // Nothing to draw while the footer covers the screen.
    if (this.anchors.end && this.anchors.end.getBoundingClientRect().top <= 0) return;

    if (!this.reduced) this.galaxy.rotation.y += dt * 0.012;
    this.galaxy.updateMatrixWorld();

    const v = this.evaluate(y);
    const c = this.cam;
    const k = this.reduced || !c.init ? 1 : 1 - Math.exp(-dt * 5);
    c.pos.lerp(v.pos, k);
    c.look.lerp(v.look, k);
    // Once the black hole has arrived it tracks the page exactly.
    const ko = v.pin ? 1 : k;
    c.cx = lerp(c.cx, v.cx, ko);
    c.cy = lerp(c.cy, v.cy, ko);
    c.dim = lerp(c.dim, v.dim ?? 1, k);
    c.init = true;
    this.camera.position.copy(c.pos);
    this.camera.lookAt(c.look);
    this.camera.setViewOffset(this.W, this.H, this.W * (0.5 - c.cx), this.H * (0.5 - c.cy), this.W, this.H);

    const { workTop, step, n } = this.m;
    const active = clamp(Math.round((y - workTop) / step), 0, n - 1);
    if (active !== this.active) { this.active = active; this.onActive?.(active); }

    const t = this.time;
    for (const m of this.starMats) m.uniforms.uTime.value = t;
    // Inside the galaxy its light steps back, so the worlds and the words stay clear.
    const gain = lerp(0.42, 1, smooth((this.camera.position.length() - 45) / 60)) * c.dim;
    for (const m of this.ownMats) m.uniforms.uOpacity.value = m.userData.opacity * gain;
    this.nav.material.uniforms.uTime.value = t;

    const heroFade = 1 - clamp(y / (this.H * 0.6));
    if (!this.reduced && heroFade > 0.2 && t > this.nextAuto) { this.from = null; this.autoRoute(); }
    this.demo.material.opacity = heroFade;
    this.demo.geometry.instanceCount = Math.floor(easeOut((t - this.demoAt) / 0.7) * this.demoSegs);
    this.nav.material.uniforms.uIdleAlpha.value = 0.4 + 0.35 * heroFade;
    this.tourLine.material.opacity = clamp((y - this.H * 0.2) / (this.H * 0.7)) * (y > workTop + (n - 1) * step + this.H * 0.5 ? 0.25 : 0.6);

    // Worlds grow in as the camera nears; from far off they would only be dark specks on the arm.
    const cp = this.camera.position, wp = new THREE.Vector3();
    for (const w of this.worlds) {
      w.group.getWorldPosition(wp);
      const dist = wp.distanceTo(cp);
      const grow = smooth((75 - dist) / 30);
      w.group.visible = grow > 0.001;
      w.group.scale.setScalar(Math.max(grow, 0.001));
      if (!this.reduced && w.group.visible) w.update(t, dt);
    }
    this.hole.group.getWorldPosition(wp);
    this.hole.group.visible = wp.distanceTo(cp) < 160;
    if (this.hole.group.visible) this.hole.update(this.reduced ? 4.2 : t, dt, this.camera);

    // Bloom eases off at the black hole, so its dark centre stays dark.
    this.bloom.strength = 0.6 - 0.32 * clamp((y - (this.m.schoolTop - this.H * 0.8)) / (this.H * 0.65));
    this.composer.render(dt);

    // Step the resolution down if frames run long.
    this.frames.push(dt);
    if (this.frames.length >= 90) {
      const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
      this.frames = [];
      if (avg > 0.026 && this.pr > 1) { this.pr = Math.max(1, this.pr - 0.25); this.resize(); }
    }
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    removeEventListener('resize', this.onResize);
    this.scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
    this.composer.dispose?.();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.canvas.remove();
  }
}
