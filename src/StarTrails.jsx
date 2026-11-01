import { useEffect, useRef } from 'react';

const COLOURS = {
  core: ['#ffe8c4', '#ffd49a', '#fff3df'],
  inner: ['#fff3df', '#eaf4f3', '#ffe3bd'],
  arm: ['#cfe4ff', '#9fc8ff', '#eaf4f3', '#b7d6ff'],
  knot: ['#ff8fa8', '#ff6f91'],
};
const pick = (list) => list[(Math.random() * list.length) | 0];
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

// A second galaxy, photographed on a long exposure. Every star draws its own
// orbit; as the band passes through the screen the exposure lengthens, the
// inner orbits sweep further than the outer ones, and the spiral smears into
// rings of light.
export default function StarTrails() {
  const wrap = useRef(null);
  const canvas = useRef(null);

  useEffect(() => {
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cv = canvas.current;
    const ctx = cv.getContext('2d');
    let W = 0, H = 0, R = 0, groups = new Map(), field = [], raf = 0, running = false;
    const centre = { x: 0, y: 0 };
    // Seen from 68° off its axis, its long axis turned a little from level.
    const FLAT = 0.37, TURN = -0.28, PITCH = Math.tan((17 * Math.PI) / 180);
    const t0 = performance.now();

    const add = (colour, star) => {
      if (!groups.has(colour)) groups.set(colour, []);
      groups.get(colour).push(star);
    };

    const build = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      W = wrap.current.clientWidth;
      H = wrap.current.clientHeight;
      cv.width = W * dpr;
      cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      centre.x = W * 0.5;
      centre.y = H * 0.5;
      R = Math.min(W * 0.44, H * 1.25);
      groups = new Map();
      const count = Math.max(500, Math.min(1600, Math.round((W * H) / 620)));
      const bar = R * 0.09;
      for (let i = 0; i < count; i++) {
        const roll = Math.random();
        if (roll < 0.18) {
          add(pick(COLOURS.core), { r: Math.abs(gauss()) * R * 0.13 + 1, a: Math.random() * Math.PI * 2, w: 0.6 + Math.random() * 1.2, alpha: 0.35 + Math.random() * 0.5 });
          continue;
        }
        const r = Math.min(R, bar + -Math.log(1 - Math.random() * 0.97) * R * 0.27);
        const arm = Math.random() < 0.5 ? 0 : Math.PI;
        const a = Math.log(r / bar) / PITCH + arm + (gauss() * (0.22 + (r / R) * 0.3) * R) / Math.max(r, R * 0.2) * 0.45;
        const colour = roll > 0.95 ? pick(COLOURS.knot) : r < R * 0.28 ? pick(COLOURS.inner) : pick(COLOURS.arm);
        add(colour, { r, a, w: 0.4 + Math.pow(Math.random(), 4) * 1.8, alpha: 0.18 + Math.pow(Math.random(), 1.5) * 0.8 });
      }
      // Faint stars of our own galaxy, in front of the far one.
      field = Array.from({ length: Math.round((W * H) / 9000) }, () => ({ x: Math.random() * W, y: Math.random() * H, s: 0.4 + Math.random() * 0.9, alpha: 0.15 + Math.random() * 0.5 }));
    };

    const draw = () => {
      const box = wrap.current.getBoundingClientRect();
      const progress = still ? 0.45 : Math.min(1, Math.max(0, (innerHeight - box.top) / (innerHeight + box.height)));
      const sweep = 0.02 + progress * progress * 0.8;
      const time = still ? 0 : (performance.now() - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#eaf4f3';
      for (const f of field) {
        ctx.globalAlpha = f.alpha;
        ctx.fillRect(f.x, f.y, f.s, f.s);
      }
      ctx.lineCap = 'round';
      for (const [colour, stars] of groups) {
        ctx.strokeStyle = colour;
        for (const s of stars) {
          // Inner orbits turn faster, so they run longer over the same exposure.
          const speed = Math.min(2, Math.sqrt((R * 0.3) / Math.max(s.r, 1)));
          const start = s.a + time * 0.02 * speed;
          ctx.globalAlpha = s.alpha;
          ctx.lineWidth = s.w;
          ctx.beginPath();
          ctx.ellipse(centre.x, centre.y, s.r, s.r * FLAT, TURN, start, start + 0.004 + sweep * speed);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };

    const frame = () => {
      raf = running ? requestAnimationFrame(frame) : 0;
      draw();
    };
    // Draw only while the band is on screen.
    const io = new IntersectionObserver(([e]) => {
      running = e.isIntersecting;
      if (running && !raf) raf = requestAnimationFrame(frame);
    });
    const ro = new ResizeObserver(() => { build(); draw(); });
    build();
    draw();
    io.observe(wrap.current);
    ro.observe(wrap.current);
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
    };
  }, []);

  return (
    <div className="trails" ref={wrap} aria-hidden="true">
      <canvas ref={canvas} />
    </div>
  );
}
