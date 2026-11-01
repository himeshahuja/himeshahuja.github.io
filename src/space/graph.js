// Nearest-neighbour graphs over points in space, and A* across them.

// Joins every point to its k nearest neighbours (both ways), then bridges any
// islands so every point can reach every other.
export function buildGraph(pos, k = 5, cell = 4) {
  const n = pos.length / 3;
  const key = (x, y, z) => `${x},${y},${z}`;
  const grid = new Map();
  const cellOf = (i) => [Math.floor(pos[i * 3] / cell), Math.floor(pos[i * 3 + 1] / cell), Math.floor(pos[i * 3 + 2] / cell)];
  for (let i = 0; i < n; i++) {
    const c = key(...cellOf(i));
    if (!grid.has(c)) grid.set(c, []);
    grid.get(c).push(i);
  }

  const d2 = (a, b) => {
    const dx = pos[a * 3] - pos[b * 3];
    const dy = pos[a * 3 + 1] - pos[b * 3 + 1];
    const dz = pos[a * 3 + 2] - pos[b * 3 + 2];
    return dx * dx + dy * dy + dz * dz;
  };

  const adj = Array.from({ length: n }, () => new Set());
  for (let i = 0; i < n; i++) {
    const [cx, cy, cz] = cellOf(i);
    let found = [];
    // Widen the search ring until there are enough candidates.
    for (let r = 1; r < 8 && found.length <= k; r++) {
      found = [];
      for (let x = cx - r; x <= cx + r; x++)
        for (let y = cy - r; y <= cy + r; y++)
          for (let z = cz - r; z <= cz + r; z++) {
            const bucket = grid.get(key(x, y, z));
            if (bucket) for (const j of bucket) if (j !== i) found.push(j);
          }
    }
    found.sort((a, b) => d2(i, a) - d2(i, b));
    for (const j of found.slice(0, k)) {
      adj[i].add(j);
      adj[j].add(i);
    }
  }

  // Bridge islands to the largest component.
  const comp = new Int32Array(n).fill(-1);
  const comps = [];
  for (let s = 0; s < n; s++) {
    if (comp[s] >= 0) continue;
    const members = [s];
    comp[s] = comps.length;
    for (let q = 0; q < members.length; q++)
      for (const j of adj[members[q]]) if (comp[j] < 0) { comp[j] = comps.length; members.push(j); }
    comps.push(members);
  }
  if (comps.length > 1) {
    const main = comps.reduce((a, b, i) => (b.length > comps[a].length ? i : a), 0);
    for (let c = 0; c < comps.length; c++) {
      if (c === main) continue;
      let best = [0, 0, Infinity];
      for (const a of comps[c])
        for (const b of comps[main]) {
          const d = d2(a, b);
          if (d < best[2]) best = [a, b, d];
        }
      adj[best[0]].add(best[1]);
      adj[best[1]].add(best[0]);
    }
  }

  // Compressed adjacency for a fast search.
  const start = new Int32Array(n + 1);
  for (let i = 0; i < n; i++) start[i + 1] = start[i] + adj[i].size;
  const nbr = new Int32Array(start[n]);
  const w = new Float32Array(start[n]);
  for (let i = 0; i < n; i++) {
    let o = start[i];
    for (const j of adj[i]) { nbr[o] = j; w[o] = Math.sqrt(d2(i, j)); o++; }
  }
  const edges = [];
  for (let i = 0; i < n; i++) for (const j of adj[i]) if (j > i) edges.push(i, j);

  return {
    n, pos, start, nbr, w, edges,
    gScore: new Float32Array(n), came: new Int32Array(n), state: new Uint8Array(n),
  };
}

// A* with a straight-line heuristic. Returns the route, the stars it settled in
// the order it settled them, and how long it took.
export function astar(g, s, t) {
  const t0 = performance.now();
  const { pos, start, nbr, w, gScore, came, state } = g;
  gScore.fill(Infinity);
  state.fill(0);
  const h = (i) => Math.hypot(pos[i * 3] - pos[t * 3], pos[i * 3 + 1] - pos[t * 3 + 1], pos[i * 3 + 2] - pos[t * 3 + 2]);

  // Binary heap of [f, node].
  const hf = [], hn = [];
  const push = (f, v) => {
    let i = hf.length;
    hf.push(f); hn.push(v);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (hf[p] <= hf[i]) break;
      [hf[p], hf[i]] = [hf[i], hf[p]];
      [hn[p], hn[i]] = [hn[i], hn[p]];
      i = p;
    }
  };
  const pop = () => {
    const v = hn[0];
    const lf = hf.pop(), ln = hn.pop();
    if (hf.length) {
      hf[0] = lf; hn[0] = ln;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < hf.length && hf[l] < hf[m]) m = l;
        if (r < hf.length && hf[r] < hf[m]) m = r;
        if (m === i) break;
        [hf[m], hf[i]] = [hf[i], hf[m]];
        [hn[m], hn[i]] = [hn[i], hn[m]];
        i = m;
      }
    }
    return v;
  };

  const explored = [];
  gScore[s] = 0;
  came[s] = -1;
  push(h(s), s);
  while (hf.length) {
    const v = pop();
    if (state[v] === 2) continue;
    state[v] = 2;
    explored.push(v);
    if (v === t) break;
    for (let o = start[v]; o < start[v + 1]; o++) {
      const j = nbr[o];
      if (state[j] === 2) continue;
      const gs = gScore[v] + w[o];
      if (gs < gScore[j]) {
        gScore[j] = gs;
        came[j] = v;
        push(gs + h(j), j);
      }
    }
  }

  const path = [];
  if (state[t] === 2) for (let v = t; v !== -1; v = came[v]) path.push(v);
  path.reverse();
  return { path, explored, ms: performance.now() - t0, length: gScore[t] };
}

// Breadth-first search on a grid, for the maze. `open(a, b)` says whether a
// step between neighbouring cells is allowed.
export function bfsGrid(cols, rows, s, t, open) {
  const came = new Int32Array(cols * rows).fill(-2);
  const order = [];
  const q = [s];
  came[s] = -1;
  for (let qi = 0; qi < q.length; qi++) {
    const v = q[qi];
    order.push(v);
    if (v === t) break;
    const x = v % cols, y = (v / cols) | 0;
    const next = [];
    if (x > 0) next.push(v - 1);
    if (x < cols - 1) next.push(v + 1);
    if (y > 0) next.push(v - cols);
    if (y < rows - 1) next.push(v + cols);
    for (const j of next) if (came[j] === -2 && open(v, j)) { came[j] = v; q.push(j); }
  }
  const path = [];
  if (came[t] !== -2) for (let v = t; v !== -1; v = came[v]) path.push(v);
  return { order, path: path.reverse() };
}

// A small seeded random generator, so a reduced-motion visit sees the same frame.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
