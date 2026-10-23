import { useEffect, useRef } from 'react';

// The hero's live piece: a small city drawn at random on each visit, where A*
// searches its way to wherever you tap. The start follows the last goal, so
// every tap sends it somewhere new.

const BLOCK = 4; // every 4th row and column is a street

function makeCity(cols, rows) {
  const street = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const onGrid = x % BLOCK === 0 || y % BLOCK === 0;
      // A few alleys through the blocks, and a few closed street segments.
      const alley = !onGrid && (x % BLOCK === 2 || y % BLOCK === 2) && Math.random() < 0.06;
      const closed = onGrid && Math.random() < 0.1;
      street[y * cols + x] = (onGrid && !closed) || alley ? 1 : 0;
    }
  }
  return street;
}

function* aStar(city, cols, rows, start, goal) {
  const h = (i) => Math.abs((i % cols) - (goal % cols)) + Math.abs(Math.floor(i / cols) - Math.floor(goal / cols));
  const g = new Float64Array(cols * rows).fill(Infinity);
  const prev = new Int32Array(cols * rows).fill(-1);
  const closed = new Uint8Array(cols * rows);
  const open = [[h(start), start]];
  g[start] = 0;
  while (open.length) {
    let best = 0;
    for (let k = 1; k < open.length; k++) if (open[k][0] < open[best][0]) best = k;
    const [, u] = open.splice(best, 1)[0];
    if (closed[u]) continue;
    closed[u] = 1;
    yield u;
    if (u === goal) {
      const path = [];
      for (let v = goal; v !== -1; v = prev[v]) path.push(v);
      return path.reverse();
    }
    const x = u % cols;
    const y = Math.floor(u / cols);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const v = ny * cols + nx;
      if (!city[v] || closed[v] || g[u] + 1 >= g[v]) continue;
      g[v] = g[u] + 1;
      prev[v] = u;
      open.push([g[v] + h(v), v]);
    }
  }
  return [];
}

export default function SearchGrid() {
  const canvasRef = useRef(null);
  const apiRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cols, rows, cell, city, start, goal, search, explored, path, pathT, raf, idle;

    const css = () => {
      const s = getComputedStyle(canvas);
      return {
        ground: s.getPropertyValue('--ground').trim(),
        block: s.getPropertyValue('--surface').trim(),
        ink: s.getPropertyValue('--ink').trim(),
        accent: s.getPropertyValue('--accent').trim(),
      };
    };

    const streets = () => {
      const out = [];
      for (let i = 0; i < city.length; i++) if (city[i]) out.push(i);
      return out;
    };

    // Keep only the street network connected to the start.
    function prune() {
      const seen = new Uint8Array(city.length);
      const stack = [start];
      seen[start] = 1;
      while (stack.length) {
        const u = stack.pop();
        const x = u % cols;
        const y = Math.floor(u / cols);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const v = ny * cols + nx;
          if (city[v] && !seen[v]) { seen[v] = 1; stack.push(v); }
        }
      }
      for (let i = 0; i < city.length; i++) if (!seen[i]) city[i] = 0;
    }

    function layout() {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = rect.width < 520 ? 14 : 18;
      cols = Math.floor(rect.width / cell);
      rows = Math.floor(rect.height / cell);
      // Streets on the edges of the grid look cut off; align the grid to blocks.
      cols -= (cols - 1) % BLOCK;
      rows -= (rows - 1) % BLOCK;
      city = makeCity(cols, rows);
      start = Math.floor(rows / 2 / BLOCK) * BLOCK * cols;
      city[start] = 1;
      prune();
      const s = streets();
      goal = s.filter((i) => i % cols > cols * 0.75)[Math.floor(Math.random() * s.length * 0.2)] ?? s[s.length - 1];
      route(goal);
    }

    function route(to) {
      goal = to;
      search = aStar(city, cols, rows, start, goal);
      explored = [];
      path = null;
      pathT = 0;
      if (reduced) {
        let r;
        while (!(r = search.next()).done) explored.push(r.value);
        path = r.value;
        pathT = 1;
        search = null;
      }
      kick();
    }

    function draw() {
      const c = css();
      const ox = (canvas.getBoundingClientRect().width - cols * cell) / 2;
      const oy = (canvas.getBoundingClientRect().height - rows * cell) / 2;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(ox, oy);
      // Buildings are drawn edge to edge so each block reads as one solid shape.
      ctx.fillStyle = c.block;
      for (let i = 0; i < city.length; i++) {
        if (city[i]) continue;
        ctx.fillRect((i % cols) * cell, Math.floor(i / cols) * cell, cell + 0.5, cell + 0.5);
      }
      ctx.fillStyle = c.accent;
      ctx.globalAlpha = 0.22;
      for (const i of explored) ctx.fillRect((i % cols) * cell, Math.floor(i / cols) * cell, cell, cell);
      ctx.globalAlpha = 1;

      const center = (i) => [(i % cols) * cell + cell / 2, Math.floor(i / cols) * cell + cell / 2];
      if (path && path.length > 1) {
        const n = Math.max(1, Math.floor(pathT * (path.length - 1)));
        ctx.beginPath();
        ctx.moveTo(...center(path[0]));
        for (let k = 1; k <= n; k++) ctx.lineTo(...center(path[k]));
        ctx.strokeStyle = c.accent;
        ctx.lineWidth = Math.max(3, cell * 0.28);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
      const dot = (i, color) => {
        const [x, y] = center(i);
        ctx.beginPath();
        ctx.arc(x, y, cell * 0.38, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      };
      dot(start, c.ink);
      dot(goal, c.accent);
      ctx.restore();
      return { ox, oy };
    }

    function frame() {
      raf = 0;
      if (search) {
        for (let k = 0; k < 3; k++) {
          const r = search.next();
          if (r.done) { path = r.value; search = null; break; }
          explored.push(r.value);
        }
      } else if (path && pathT < 1) {
        pathT = Math.min(1, pathT + 0.05);
      }
      draw();
      if (search || (path && pathT < 1)) kick();
      else scheduleIdle();
    }

    function kick() {
      if (!raf) raf = requestAnimationFrame(frame);
    }

    // With nobody tapping, wander to a new spot now and then.
    function scheduleIdle() {
      clearTimeout(idle);
      if (reduced) return;
      idle = setTimeout(() => {
        if (document.hidden) return scheduleIdle();
        start = goal;
        const s = streets();
        route(s[Math.floor(Math.random() * s.length)]);
      }, 5000);
    }

    function cellAt(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const ox = (rect.width - cols * cell) / 2;
      const oy = (rect.height - rows * cell) / 2;
      const x = Math.floor((clientX - rect.left - ox) / cell);
      const y = Math.floor((clientY - rect.top - oy) / cell);
      if (x < 0 || y < 0 || x >= cols || y >= rows) return -1;
      // Snap a tap on a block to the nearest street cell.
      let best = -1;
      let bestD = Infinity;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const i = ny * cols + nx;
          const d = dx * dx + dy * dy;
          if (city[i] && d < bestD) { bestD = d; best = i; }
        }
      }
      return best;
    }

    function onPointer(e) {
      const i = cellAt(e.clientX, e.clientY);
      if (i < 0 || i === goal) return;
      clearTimeout(idle);
      start = goal;
      route(i);
    }

    apiRef.current = () => {
      clearTimeout(idle);
      start = goal;
      const s = streets();
      route(s[Math.floor(Math.random() * s.length)]);
    };

    canvas.addEventListener('pointerdown', onPointer);
    const ro = new ResizeObserver(() => layout());
    ro.observe(canvas);
    return () => {
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onPointer);
      cancelAnimationFrame(raf);
      clearTimeout(idle);
    };
  }, []);

  return (
    <figure className="search-grid">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="A small grid city where an A* search finds a route to wherever you tap."
      />
      <figcaption>
        A* on a city drawn fresh for this visit. Tap any street to send it there, or{' '}
        <button type="button" className="text-button" onClick={() => apiRef.current?.()}>
          pick one for me
        </button>
        .
      </figcaption>
    </figure>
  );
}
