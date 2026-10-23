import { useEffect, useRef } from 'react';

// The hero: the name drawn as a network. Nodes are sampled inside the letter
// shapes and joined to their neighbours. Packets wander the edges like
// messages between servers, and the pointer sends a breadth-first ripple of
// traffic out through the letters.

const FONT = '"Inter Tight", system-ui, sans-serif';
const GAP = 0.3; // between stacked lines, as a share of cap height

function readColors(el) {
  const s = getComputedStyle(el);
  return { ink: s.getPropertyValue('--ink').trim(), accent: s.getPropertyValue('--accent').trim() };
}

// Paint the name into an offscreen canvas, each line clipped to cap height and
// baseline so round letters don't poke out, and return its pixels.
function rasterise(lines, w, h) {
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  const o = off.getContext('2d', { willReadFrequently: true });
  const capOf = (size) => {
    o.font = `800 ${size}px ${FONT}`;
    return o.measureText('H').actualBoundingBoxAscent;
  };
  const fit = (text) => {
    let size = Math.round(h * 1.4);
    for (; size > 10; size -= 2) {
      const cap = capOf(size);
      const width = Math.max(...text.map((t) => o.measureText(t).width));
      if (width <= w * 0.92 && cap * (text.length + GAP * (text.length - 1)) <= h * 0.74) break;
    }
    return size;
  };
  const oneLine = [lines[0]];
  const stacked = lines.slice(1);
  const text = capOf(fit(stacked)) > capOf(fit(oneLine)) * 1.15 ? stacked : oneLine;
  const size = fit(text);
  const cap = capOf(size);
  const gap = cap * GAP;
  let top = (h - (cap * text.length + gap * (text.length - 1))) / 2;
  o.font = `800 ${size}px ${FONT}`;
  o.textAlign = 'center';
  o.textBaseline = 'alphabetic';
  for (const t of text) {
    o.save();
    o.beginPath();
    o.rect(0, top, w, cap);
    o.clip();
    o.fillText(t, w / 2, top + cap);
    o.restore();
    top += cap + gap;
  }
  return o.getImageData(0, 0, w, h).data;
}

// Nodes on a jittered grid inside the letters; edges between close neighbours.
function buildGraph(lines, w, h, spacing) {
  const ink = rasterise(lines, w, h);
  const inside = (x, y) => {
    const xi = Math.round(x), yi = Math.round(y);
    return xi >= 0 && yi >= 0 && xi < w && yi < h && ink[(yi * w + xi) * 4 + 3] > 140;
  };
  const nodes = [];
  for (let y = spacing / 2; y < h; y += spacing) {
    for (let x = spacing / 2; x < w; x += spacing) {
      const jx = x + (Math.random() - 0.5) * spacing * 0.5;
      const jy = y + (Math.random() - 0.5) * spacing * 0.5;
      if (inside(jx, jy)) nodes.push({ x: jx, y: jy });
      else if (inside(x, y)) nodes.push({ x, y });
    }
  }

  const reach = spacing * 1.6;
  const cell = reach;
  const grid = new Map();
  nodes.forEach((n, i) => {
    const k = `${Math.floor(n.x / cell)},${Math.floor(n.y / cell)}`;
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  });
  const adj = nodes.map(() => []);
  const edges = [];
  nodes.forEach((n, i) => {
    const cx = Math.floor(n.x / cell), cy = Math.floor(n.y / cell);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (const j of grid.get(`${cx + dx},${cy + dy}`) || []) {
          if (j <= i) continue;
          const m = nodes[j];
          // Only join points whose midpoint is also inside a letter, so edges never bridge two letters.
          if (Math.hypot(m.x - n.x, m.y - n.y) > reach || !inside((n.x + m.x) / 2, (n.y + m.y) / 2)) continue;
          const e = edges.length;
          edges.push({ a: i, b: j, heat: 0 });
          adj[i].push([j, e]);
          adj[j].push([i, e]);
        }
      }
    }
  });
  return { nodes, edges, adj };
}

export default function NameNetwork({ lines }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, dpr = 1;
    let graph = null;
    let base = null; // the static mesh, drawn once
    let nodeHeat = new Float32Array(0);
    let packets = [];
    let ripples = [];
    let colors = readColors(canvas);
    let raf = 0, last = 0, introStart = 0, introDone = reduced;
    let pointerAt = 0, lastRippleNode = -1, nextIdle = 0;

    function layout() {
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const spacing = Math.max(8, Math.min(14, w / 110));
      graph = buildGraph(lines, Math.round(w), Math.round(h), spacing);
      nodeHeat = new Float32Array(graph.nodes.length);
      packets = [];
      ripples = [];
      paintBase();
      introStart = performance.now();
      introDone = reduced;
    }

    function paintBase() {
      base = document.createElement('canvas');
      base.width = canvas.width;
      base.height = canvas.height;
      const b = base.getContext('2d');
      b.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawMesh(b, Infinity);
    }

    // The mesh up to a reveal line (for the opening), or all of it.
    function drawMesh(c, revealX) {
      const { nodes, edges } = graph;
      c.beginPath();
      for (const e of edges) {
        const a = nodes[e.a], b = nodes[e.b];
        if (Math.max(a.x, b.x) > revealX) continue;
        c.moveTo(a.x, a.y);
        c.lineTo(b.x, b.y);
      }
      c.strokeStyle = colors.ink;
      c.globalAlpha = 0.28;
      c.lineWidth = 1;
      c.stroke();
      c.globalAlpha = 0.9;
      c.fillStyle = colors.ink;
      for (const n of nodes) {
        if (n.x > revealX) continue;
        c.beginPath();
        c.arc(n.x, n.y, 1.7, 0, Math.PI * 2);
        c.fill();
      }
      c.globalAlpha = 1;
    }

    function spawnPacket() {
      const { nodes, adj } = graph;
      if (!nodes.length) return;
      let at = (Math.random() * nodes.length) | 0;
      for (let tries = 0; tries < 5 && !adj[at].length; tries++) at = (Math.random() * nodes.length) | 0;
      if (!adj[at].length) return;
      const [to, edge] = adj[at][(Math.random() * adj[at].length) | 0];
      packets.push({ from: at, to, edge, t: 0, speed: 2.2 + Math.random() * 1.6, life: 6 + Math.random() * 8 });
    }

    // Breadth-first ripple: nodes light up in order of hops from the source.
    function ripple(source, depth = 14) {
      const { adj } = graph;
      const seen = new Map([[source, 0]]);
      const queue = [source];
      const t0 = performance.now();
      ripples.push({ node: source, edge: -1, at: t0 });
      for (let i = 0; i < queue.length; i++) {
        const u = queue[i];
        const d = seen.get(u);
        if (d >= depth) continue;
        for (const [v, e] of adj[u]) {
          if (seen.has(v)) continue;
          seen.set(v, d + 1);
          queue.push(v);
          ripples.push({ node: v, edge: e, at: t0 + (d + 1) * 55 });
        }
      }
    }

    function nearestNode(x, y, within) {
      let best = -1, bestD = within * within;
      graph.nodes.forEach((n, i) => {
        const d = (n.x - x) ** 2 + (n.y - y) ** 2;
        if (d < bestD) { bestD = d; best = i; }
      });
      return best;
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      if (!graph) return; // the first frames can arrive before the first layout
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      const { nodes, edges, adj } = graph;
      ctx.clearRect(0, 0, w, h);

      // Opening: the mesh wires itself up from left to right.
      if (!introDone) {
        const p = Math.min(1, (now - introStart) / 1300);
        const eased = 1 - (1 - p) ** 3;
        drawMesh(ctx, eased * w * 1.05);
        if (p >= 1) {
          introDone = true;
          for (let i = 0; i < 28; i++) spawnPacket();
          nextIdle = now + 1500;
        }
        return;
      }
      ctx.drawImage(base, 0, 0, w, h);
      if (reduced) return;

      // Ripples fire as their hop time comes up.
      ripples = ripples.filter((r) => {
        if (r.at > now) return true;
        nodeHeat[r.node] = 1;
        if (r.edge >= 0) edges[r.edge].heat = 1;
        return false;
      });

      // When nobody is pointing, traffic starts somewhere on its own now and then.
      if (now - pointerAt > 2500 && now > nextIdle) {
        ripple((Math.random() * nodes.length) | 0, 10);
        nextIdle = now + 2600 + Math.random() * 1800;
      }

      // Packets walk the graph, warming each edge they cross.
      for (const pk of packets) {
        pk.t += dt * pk.speed;
        pk.life -= dt;
        edges[pk.edge].heat = Math.max(edges[pk.edge].heat, 0.85);
        if (pk.t >= 1) {
          const options = adj[pk.to].filter(([v]) => v !== pk.from);
          const [next, edge] = (options.length ? options : adj[pk.to])[(Math.random() * (options.length || adj[pk.to].length)) | 0];
          pk.from = pk.to;
          pk.to = next;
          pk.edge = edge;
          pk.t = 0;
        }
      }
      packets = packets.filter((pk) => pk.life > 0);
      while (packets.length < 28) spawnPacket();

      // Warm edges and nodes, fading.
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 1.6;
      for (const e of edges) {
        if (e.heat <= 0.02) { e.heat = 0; continue; }
        const a = nodes[e.a], b = nodes[e.b];
        ctx.globalAlpha = e.heat * 0.9;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        e.heat -= dt * 1.4;
      }
      ctx.fillStyle = colors.accent;
      for (let i = 0; i < nodes.length; i++) {
        const heat = nodeHeat[i];
        if (heat <= 0.02) continue;
        ctx.globalAlpha = heat;
        ctx.beginPath();
        ctx.arc(nodes[i].x, nodes[i].y, 1.8 + heat * 1.8, 0, Math.PI * 2);
        ctx.fill();
        nodeHeat[i] = heat - dt * 1.6;
      }
      ctx.globalAlpha = 1;

      // The packets themselves.
      for (const pk of packets) {
        const a = nodes[pk.from], b = nodes[pk.to];
        ctx.beginPath();
        ctx.arc(a.x + (b.x - a.x) * pk.t, a.y + (b.y - a.y) * pk.t, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const onMove = (e) => {
      if (!introDone || reduced) return;
      const rect = canvas.getBoundingClientRect();
      pointerAt = performance.now();
      const n = nearestNode(e.clientX - rect.left, e.clientY - rect.top, 40);
      if (n >= 0 && n !== lastRippleNode) {
        lastRippleNode = n;
        ripple(n, e.pointerType === 'mouse' ? 7 : 14);
      }
    };
    const onTheme = () => { colors = readColors(canvas); if (graph) paintBase(); };

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onMove);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', onTheme);

    let ro;
    document.fonts.load(`800 40px ${FONT}`).finally(() => {
      colors = readColors(canvas);
      ro = new ResizeObserver(() => layout());
      ro.observe(canvas);
      raf = requestAnimationFrame(frame);
    });

    return () => {
      ro?.disconnect();
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onMove);
      mq.removeEventListener('change', onTheme);
    };
  }, [lines]);

  return <canvas ref={canvasRef} className="name-net" aria-hidden="true" />;
}
