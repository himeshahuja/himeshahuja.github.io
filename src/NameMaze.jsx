import { useEffect, useRef } from 'react';

// The hero: the name is drawn as walls on a grid. A breadth-first wave floods
// around the letters when the page opens, then A* routes around the name to
// wherever the pointer goes (or to a random spot when nobody is pointing).

// Inter Tight rasterises cleanly at grid resolution; the display face's S grows spurs.
const FONT = '"Inter Tight", system-ui, sans-serif';
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function readColors(el) {
  const s = getComputedStyle(el);
  return {
    ink: s.getPropertyValue('--ink').trim(),
    accent: s.getPropertyValue('--accent').trim(),
    dot: s.getPropertyValue('--dot').trim(),
  };
}

// `lines` is [one-line name, ...the name split for narrow screens]; pass a stable array.
export default function NameMaze({ lines }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let cols = 0, rows = 0, cell = 10, ox = 0, oy = 0;
    let wall, waveDist, maxWave = 0, start = 0;
    let introStart = 0, introDone = reduced;
    let explored = [], path = null, pathT = 1, goal = -1;
    let search = null, pointerAt = 0, idleTimer = 0, raf = 0, colors = readColors(canvas);

    const idx = (x, y) => y * cols + x;

    function neighbors(i, fn) {
      const x = i % cols;
      const y = (i / cols) | 0;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) fn(idx(nx, ny));
      }
    }

    // Rasterise the name at grid resolution; every inked pixel is a wall.
    function buildWalls() {
      const off = document.createElement('canvas');
      off.width = cols;
      off.height = rows;
      const o = off.getContext('2d', { willReadFrequently: true });
      // Largest size at which the given lines fit, leaving room to route around them.
      const fit = (text) => {
        let size = rows;
        for (; size > 6; size -= 1) {
          o.font = `800 ${size}px ${FONT}`;
          const w = Math.max(...text.map((t) => o.measureText(t).width));
          if (w <= cols * 0.9 && size * 0.92 * text.length <= rows * 0.8) break;
        }
        return size;
      };
      // One line or stacked, whichever lets the name be bigger.
      const oneLine = [lines[0]];
      const stacked = lines.slice(1);
      const text = fit(stacked) > fit(oneLine) * 1.15 ? stacked : oneLine;
      const size = fit(text);
      o.font = `800 ${size}px ${FONT}`;
      o.textAlign = 'center';
      o.textBaseline = 'middle';
      o.fillStyle = '#000';
      const lh = size * 0.92;
      text.forEach((t, k) => o.fillText(t, cols / 2, rows / 2 + (k - (text.length - 1) / 2) * lh));
      const data = o.getImageData(0, 0, cols, rows).data;
      wall = new Uint8Array(cols * rows);
      for (let i = 0; i < cols * rows; i++) wall[i] = data[i * 4 + 3] > 128 ? 1 : 0;
      // Drop specks from anti-aliasing and overshoot: walls with at most one wall neighbour.
      const specks = [];
      for (let i = 0; i < cols * rows; i++) {
        if (!wall[i]) continue;
        let n = 0;
        neighbors(i, (v) => { n += wall[v]; });
        if (n <= 1) specks.push(i);
      }
      for (const i of specks) wall[i] = 0;
    }

    // Distance (in steps) of every open cell from the start, for the opening wave.
    function measureWave() {
      waveDist = new Int32Array(cols * rows).fill(-1);
      const queue = [start];
      waveDist[start] = 0;
      maxWave = 0;
      for (let h = 0; h < queue.length; h++) {
        const u = queue[h];
        neighbors(u, (v) => {
          if (wall[v] || waveDist[v] >= 0) return;
          waveDist[v] = waveDist[u] + 1;
          maxWave = Math.max(maxWave, waveDist[v]);
          queue.push(v);
        });
      }
    }

    function aStar(from, to) {
      const tx = to % cols, ty = (to / cols) | 0;
      const h = (i) => Math.abs((i % cols) - tx) + Math.abs(((i / cols) | 0) - ty);
      const g = new Float32Array(cols * rows).fill(Infinity);
      const prev = new Int32Array(cols * rows).fill(-1);
      const closed = new Uint8Array(cols * rows);
      const heap = [[h(from), from]];
      const order = [];
      g[from] = 0;
      const push = (item) => {
        heap.push(item);
        let i = heap.length - 1;
        while (i > 0) {
          const p = (i - 1) >> 1;
          if (heap[p][0] <= heap[i][0]) break;
          [heap[p], heap[i]] = [heap[i], heap[p]];
          i = p;
        }
      };
      const pop = () => {
        const top = heap[0];
        const last = heap.pop();
        if (heap.length) {
          heap[0] = last;
          let i = 0;
          for (;;) {
            const l = 2 * i + 1, r = l + 1;
            let m = i;
            if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
            if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
            if (m === i) break;
            [heap[m], heap[i]] = [heap[i], heap[m]];
            i = m;
          }
        }
        return top[1];
      };
      while (heap.length) {
        const u = pop();
        if (closed[u]) continue;
        closed[u] = 1;
        order.push(u);
        if (u === to) break;
        neighbors(u, (v) => {
          if (wall[v] || closed[v] || g[u] + 1 >= g[v]) return;
          g[v] = g[u] + 1;
          prev[v] = u;
          // Tiny tie-break toward the goal keeps paths straight and searches tight.
          push([g[v] + h(v) * 1.001, v]);
        });
      }
      if (prev[to] < 0 && to !== from) return { order, path: null };
      const p = [];
      for (let v = to; v !== -1; v = prev[v]) p.push(v);
      return { order, path: p.reverse() };
    }

    function layout() {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cell = rect.width < 640 ? 7 : rect.width < 1100 ? 9 : 10;
      cols = Math.floor(rect.width / cell);
      rows = Math.floor(rect.height / cell);
      ox = (rect.width - cols * cell) / 2;
      oy = (rect.height - rows * cell) / 2;
      buildWalls();
      start = idx(1, (rows / 2) | 0);
      while (wall[start] && start < cols * rows - 1) start += cols;
      measureWave();
      explored = [];
      path = null;
      goal = -1;
      search = null;
      introStart = performance.now();
      kick();
    }

    function cellAt(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((clientX - rect.left - ox) / cell);
      const y = Math.floor((clientY - rect.top - oy) / cell);
      if (x < 0 || y < 0 || x >= cols || y >= rows) return -1;
      // Pointing at a letter routes to the nearest open cell beside it.
      for (let r = 0; r < 4; r++) {
        for (let dy = -r; dy <= r; dy++) {
          for (let dx = -r; dx <= r; dx++) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
            const i = idx(nx, ny);
            if (!wall[i] && waveDist[i] >= 0) return i;
          }
        }
      }
      return -1;
    }

    function routeTo(target, animate) {
      if (target < 0 || target === goal) return;
      goal = target;
      const result = aStar(start, target);
      if (animate && !reduced) {
        search = { order: result.order, at: 0, path: result.path };
        explored = [];
        path = null;
      } else {
        search = null;
        explored = result.order;
        path = result.path;
        pathT = 1;
      }
      kick();
    }

    function wander() {
      clearTimeout(idleTimer);
      if (reduced) return;
      idleTimer = setTimeout(() => {
        if (document.hidden || performance.now() - pointerAt < 3000) return wander();
        const open = [];
        for (let i = 0; i < cols * rows; i++) if (waveDist[i] > maxWave * 0.45) open.push(i);
        routeTo(open[(Math.random() * open.length) | 0], true);
        wander();
      }, 3200);
    }

    function draw(now) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.translate(ox, oy);

      // Dot grid.
      ctx.fillStyle = colors.dot;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          if (!wall[idx(x, y)]) ctx.fillRect(x * cell + cell / 2 - 0.75, y * cell + cell / 2 - 0.75, 1.5, 1.5);
        }
      }

      // The opening wave: a bright front with a fading wake.
      ctx.fillStyle = colors.accent;
      if (!introDone) {
        const front = ((now - introStart) / 1000) * Math.max(60, maxWave / 1.6);
        for (let i = 0; i < cols * rows; i++) {
          const d = waveDist[i];
          if (d < 0 || d > front) continue;
          const age = front - d;
          const a = Math.max(0, 0.75 - age / 26);
          if (a <= 0.01) continue;
          ctx.globalAlpha = a;
          ctx.fillRect((i % cols) * cell, ((i / cols) | 0) * cell, cell, cell);
        }
        ctx.globalAlpha = 1;
        if (front > maxWave + 40) {
          introDone = true;
          wander();
        }
      }

      // Cells the current search has looked at.
      ctx.globalAlpha = 0.28;
      for (const i of explored) ctx.fillRect((i % cols) * cell, ((i / cols) | 0) * cell, cell, cell);
      ctx.globalAlpha = 1;

      // The name.
      ctx.fillStyle = colors.ink;
      for (let i = 0; i < cols * rows; i++) {
        if (wall[i]) ctx.fillRect((i % cols) * cell + 0.5, ((i / cols) | 0) * cell + 0.5, cell - 1, cell - 1);
      }

      // The route.
      const c = (i) => [(i % cols) * cell + cell / 2, ((i / cols) | 0) * cell + cell / 2];
      if (path && path.length > 1) {
        const n = Math.max(1, Math.floor(pathT * (path.length - 1)));
        ctx.beginPath();
        ctx.moveTo(...c(path[0]));
        for (let k = 1; k <= n; k++) ctx.lineTo(...c(path[k]));
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = Math.max(2.5, cell * 0.32);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      const dot = (i, color, r) => {
        const [x, y] = c(i);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      };
      if (introDone || reduced) dot(start, colors.ink, cell * 0.55);
      if (goal >= 0) dot(goal, colors.accent, cell * 0.55);
      ctx.restore();
    }

    function frame(now) {
      raf = 0;
      if (search) {
        search.at = Math.min(search.order.length, search.at + Math.max(6, (search.order.length / 50) | 0));
        explored = search.order.slice(0, search.at);
        if (search.at >= search.order.length) {
          path = search.path;
          pathT = 0;
          search = null;
        }
      } else if (path && pathT < 1) {
        pathT = Math.min(1, pathT + 0.06);
      }
      draw(now);
      if (!introDone || search || (path && pathT < 1)) kick();
    }

    function kick() {
      if (!raf) raf = requestAnimationFrame(frame);
    }

    const onMove = (e) => {
      if (!introDone) return;
      pointerAt = performance.now();
      routeTo(cellAt(e.clientX, e.clientY), e.pointerType !== 'mouse');
    };
    const onLeave = () => { pointerAt = performance.now(); };
    const onTheme = () => { colors = readColors(canvas); kick(); };

    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onMove);
    canvas.addEventListener('pointerleave', onLeave);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', onTheme);

    let ro;
    // Wait for the display face so the letters are drawn in it.
    document.fonts.load(`800 40px ${FONT}`).finally(() => {
      colors = readColors(canvas);
      ro = new ResizeObserver(() => layout());
      ro.observe(canvas);
    });

    return () => {
      ro?.disconnect();
      cancelAnimationFrame(raf);
      clearTimeout(idleTimer);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      mq.removeEventListener('change', onTheme);
    };
  }, [lines]);

  return <canvas ref={canvasRef} className="name-maze" aria-hidden="true" />;
}
