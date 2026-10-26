// The backdrop layers, generated from a fixed seed so the world is the same on
// every visit. Units snap to a 4px grid so edges stay on the pixel.
import { toRectsWith } from './pixels.js';

const U = 4;
const snap = (v) => Math.round(v / U) * U;

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function Stars({ w, h }) {
  const r = rng(7);
  const count = Math.round((w * h) / 9000);
  const stars = Array.from({ length: count }, () => ({
    x: snap(r() * w),
    y: snap(r() * h * 0.62),
    big: r() < 0.08,
    dim: r() < 0.35,
    tw: r() < 0.3,
    d: Math.round(r() * 2400),
  }));
  return (
    <svg className="stars" width={w} height={h} shapeRendering="crispEdges" aria-hidden="true">
      {stars.map((s, i) => {
        const props = {
          className: [s.tw && 'twinkle', s.dim && 'dim'].filter(Boolean).join(' ') || undefined,
          style: s.tw ? { animationDelay: `-${s.d}ms` } : undefined,
        };
        // The brightest stars get a little cross of light.
        if (s.big) {
          return (
            <g key={i} {...props}>
              <rect x={s.x} y={s.y - U} width={U} height={U * 3} />
              <rect x={s.x - U} y={s.y} width={U * 3} height={U} />
            </g>
          );
        }
        return <rect key={i} x={s.x} y={s.y} width={U} height={U} {...props} />;
      })}
    </svg>
  );
}

export function Mountains({ w, h, ground }) {
  const r = rng(11);
  const p1 = r() * 6, p2 = r() * 6, p3 = r() * 6;
  const base = h - ground;
  const step = U * 4;
  const tops = [];
  let d = `M0 ${base}`;
  for (let x = 0; x <= w; x += step) {
    const rise = 0.17 + 0.09 * Math.sin(x / 260 + p1) + 0.06 * Math.sin(x / 97 + p2) + 0.03 * Math.sin(x / 41 + p3);
    const y = snap(base - rise * h);
    tops.push({ x, y, high: rise > 0.27 });
    d += ` L${x} ${y} L${x + step} ${y}`;
  }
  d += ` L${w} ${base} Z`;
  return (
    <svg className="mountains" width={w} height={h} shapeRendering="crispEdges" aria-hidden="true">
      <path d={d} />
      {/* Moonlight along the ridge, and snow on the tallest peaks. */}
      {tops.map((t, i) => (
        <g key={i}>
          <rect className="ridge" x={t.x} y={t.y} width={step} height={U} />
          {t.high && <rect className="snow" x={t.x} y={t.y} width={step} height={U * 2} />}
        </g>
      ))}
    </svg>
  );
}

export function Skyline({ w, h, ground }) {
  const r = rng(23);
  const base = h - ground;
  const blocks = [];
  for (let x = snap(r() * 80); x < w; ) {
    const bw = snap(48 + r() * 72);
    const bh = snap(h * (0.1 + r() * 0.22));
    const lit = [];
    for (let wy = base - bh + 12; wy < base - 12; wy += 16) {
      for (let wx = x + 8; wx < x + bw - 8; wx += 12) {
        const roll = r();
        if (roll < 0.04) lit.push([wx, wy, 'tv']);
        else if (roll < 0.24) lit.push([wx, wy, 'lit']);
      }
    }
    const roof = r();
    blocks.push({ x, bw, bh, lit, tone: r() < 0.5, roof: roof < 0.22 ? 'antenna' : roof < 0.38 ? 'tank' : null });
    x += bw + snap(r() * 56);
  }
  return (
    <svg className="skyline" width={w} height={h} shapeRendering="crispEdges" aria-hidden="true">
      {blocks.map((b, i) => {
        const top = base - b.bh;
        const mid = b.x + snap(b.bw / 2);
        return (
          <g key={i}>
            <rect x={b.x} y={top} width={b.bw} height={b.bh} className={b.tone ? 'tone-a' : 'tone-b'} />
            <rect x={b.x + b.bw - U} y={top} width={U} height={b.bh} className="edge" />
            <rect x={b.x} y={top} width={b.bw} height={U} className="edge" />
            {b.roof === 'antenna' && (
              <>
                <rect x={mid} y={top - 24} width={U} height={24} className="tone-a" />
                <rect x={mid} y={top - 28} width={U} height={U} className="beacon" />
              </>
            )}
            {b.roof === 'tank' && (
              <>
                <rect x={b.x + 8} y={top - 20} width={U * 4} height={U * 3} className="tone-a" />
                <rect x={b.x + 8} y={top - 24} width={U * 4} height={U} className="edge" />
                <rect x={b.x + 8} y={top - 8} width={U} height={8} className="tone-a" />
                <rect x={b.x + 20} y={top - 8} width={U} height={8} className="tone-a" />
              </>
            )}
            {b.lit.map(([x, y, kind], j) => <rect key={j} x={x} y={y} width={U} height={U * 2} className={kind} />)}
          </g>
        );
      })}
    </svg>
  );
}

// Bushes, flowers, rocks, tufts and fence posts in front of the brick, moving
// faster than the level so the ground has depth.
export function Foreground({ w, h }) {
  const r = rng(53);
  const items = [];
  for (let x = snap(r() * 120); x < w; x += snap(110 + r() * 300)) {
    const kind = r();
    if (kind < 0.36) items.push({ kind: 'bush', x, bw: snap(56 + r() * 64), bh: snap(20 + r() * 16) });
    else if (kind < 0.58) items.push({ kind: 'flowers', x, n: 2 + Math.floor(r() * 3), hue: r() < 0.5 });
    else if (kind < 0.74) items.push({ kind: 'rock', x, rw: snap(20 + r() * 20) });
    else if (kind < 0.88) items.push({ kind: 'tuft', x });
    else items.push({ kind: 'fence', x, n: 3 + Math.floor(r() * 3) });
  }
  return (
    <svg className="foreground" width={w} height={h} shapeRendering="crispEdges" aria-hidden="true">
      {items.map((it, i) => {
        if (it.kind === 'bush') {
          return (
            <g key={i} className="bush">
              <rect x={it.x + U * 2} y={h - it.bh} width={it.bw - U * 4} height={it.bh} />
              <rect x={it.x} y={h - it.bh + U * 2} width={it.bw} height={it.bh - U * 2} />
              <rect className="bush__lit" x={it.x + U * 3} y={h - it.bh + U} width={U * 3} height={U} />
              <rect className="bush__lit" x={it.x + snap(it.bw / 2)} y={h - it.bh + U * 2} width={U * 2} height={U} />
              <rect className="bush__dark" x={it.x + U} y={h - U * 2} width={it.bw - U * 2} height={U} />
              <rect className="bush__berry" x={it.x + snap(it.bw / 3)} y={h - it.bh + U * 4} width={U} height={U} />
            </g>
          );
        }
        if (it.kind === 'flowers') {
          return (
            <g key={i} className={`flowers${it.hue ? ' flowers--gold' : ''}`}>
              {Array.from({ length: it.n }, (_, k) => (
                <g key={k}>
                  <rect className="flowers__stem" x={it.x + k * U * 4 + U} y={h - U * 4} width={U} height={U * 4} />
                  <rect className="flowers__stem" x={it.x + k * U * 4 + U * 2} y={h - U * 3} width={U} height={U} />
                  <rect className="flowers__head" x={it.x + k * U * 4} y={h - U * 6} width={U * 3} height={U * 2} />
                  <rect className="flowers__eye" x={it.x + k * U * 4 + U} y={h - U * 6} width={U} height={U} />
                </g>
              ))}
            </g>
          );
        }
        if (it.kind === 'rock') {
          return (
            <g key={i} className="rock">
              <rect x={it.x + U} y={h - U * 4} width={it.rw - U * 2} height={U * 4} />
              <rect x={it.x} y={h - U * 3} width={it.rw} height={U * 3} />
              <rect className="rock__lit" x={it.x + U * 2} y={h - U * 4} width={it.rw - U * 5} height={U} />
            </g>
          );
        }
        if (it.kind === 'tuft') {
          return (
            <g key={i} className="tuft">
              <rect x={it.x} y={h - U * 3} width={U} height={U * 3} />
              <rect x={it.x + U * 2} y={h - U * 5} width={U} height={U * 5} />
              <rect x={it.x + U * 4} y={h - U * 2} width={U} height={U * 2} />
              <rect x={it.x + U} y={h - U} width={U * 3} height={U} />
            </g>
          );
        }
        return (
          <g key={i} className="fence">
            <rect x={it.x} y={h - U * 6} width={it.n * U * 5} height={U} />
            <rect x={it.x} y={h - U * 3} width={it.n * U * 5} height={U} />
            {Array.from({ length: it.n + 1 }, (_, k) => (
              <rect key={k} x={it.x + k * U * 5 - (k === it.n ? U : 0)} y={h - U * 8} width={U} height={U * 8} />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export function Clouds({ w, h }) {
  const r = rng(41);
  const clouds = [];
  for (let x = snap(r() * 200); x < w; x += snap(320 + r() * 420)) {
    const y = snap(h * (0.14 + r() * 0.24));
    const cw = snap(64 + r() * 96);
    clouds.push({ x, y, cw });
  }
  return (
    <svg className="clouds" width={w} height={h} shapeRendering="crispEdges" aria-hidden="true">
      {clouds.map((c, i) => (
        <g key={i}>
          <rect x={c.x + U * 4} y={c.y} width={c.cw - U * 8} height={U * 2} />
          <rect x={c.x} y={c.y + U * 2} width={c.cw} height={U * 3} />
          <rect x={c.x + U * 2} y={c.y + U * 5} width={c.cw - U * 4} height={U} />
          <rect className="cloud__lit" x={c.x + U * 5} y={c.y} width={c.cw - U * 12} height={U} />
          <rect className="cloud__lit" x={c.x + U} y={c.y + U * 2} width={U * 3} height={U} />
          <rect className="cloud__dark" x={c.x + U * 3} y={c.y + U * 5} width={c.cw - U * 6} height={U} />
        </g>
      ))}
    </svg>
  );
}

// A full moon with craters, its shadowed edge and two faint rings of glow.
const MOON_SIZE = 28;
const MOON_PAL = {
  o: 'rgba(236, 230, 207, 0.05)',
  i: 'rgba(236, 230, 207, 0.1)',
  M: '#ece6cf',
  s: '#cfc6a6',
  c: '#bdb38f',
};
const CRATERS = [[-3, -3, 2, 2], [2, 0, 3, 2], [-1, 3, 1, 1], [3, -4, 1, 1], [-4, 1, 1, 2], [0, -1, 1, 1]];
const MOON = (() => {
  const c = MOON_SIZE / 2;
  const rows = [];
  for (let y = 0; y < MOON_SIZE; y++) {
    let row = '';
    for (let x = 0; x < MOON_SIZE; x++) {
      const dx = x + 0.5 - c;
      const dy = y + 0.5 - c;
      const d = Math.hypot(dx, dy);
      let ch = '.';
      if (d <= 7) {
        ch = dx < -4 || dy > 5 ? 's' : 'M';
        const cx = x - c;
        const cy = y - c;
        if (CRATERS.some(([kx, ky, kw, kh]) => cx >= kx && cx < kx + kw && cy >= ky && cy < ky + kh)) ch = 'c';
      } else if (d <= 10.5) ch = 'i';
      else if (d <= 13.5) ch = 'o';
      row += ch;
    }
    rows.push(row);
  }
  return toRectsWith(rows, MOON_PAL);
})();

// Decoration, so it is painted as a background rather than placed as content.
export const MOON_IMAGE = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MOON_SIZE} ${MOON_SIZE}" shape-rendering="crispEdges">${
    MOON.map((m) => `<rect x="${m.x}" y="${m.y}" width="${m.w}" height="1" fill="${m.fill}"/>`).join('')
  }</svg>`,
)}")`;
