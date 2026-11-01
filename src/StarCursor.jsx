import { useEffect, useRef } from 'react';

const MOTE_COLOURS = ['#ffffff', '#cfe4ff', '#9fe8ff', '#ffb23f'];

// The pointer as a small four-point star that leaves a wake of stardust and
// throws a few sparks on a click. Only for a mouse or trackpad.
export default function StarCursor() {
  const star = useRef(null);
  const dust = useRef(null);

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const root = document.documentElement;
    root.classList.add('star-cursor');
    const el = star.current;
    const cv = dust.current;
    const ctx = cv.getContext('2d');

    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      cv.width = innerWidth * dpr;
      cv.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    addEventListener('resize', size);

    const motes = [];
    let x = -100, y = -100, lx = x, ly = y, hot = false, down = false, spin = 0, last = performance.now(), raf = 0;

    const spark = (px, py, speed) => {
      const a = Math.random() * Math.PI * 2;
      motes.push({
        x: px, y: py, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life: 1, size: 1 + Math.random() * 2.2, colour: MOTE_COLOURS[(Math.random() * MOTE_COLOURS.length) | 0],
      });
    };
    const onMove = (e) => {
      x = e.clientX;
      y = e.clientY;
      hot = !!e.target.closest?.('a, button');
      el.style.opacity = '1';
      if (still) return;
      // One mote for every few pixels travelled.
      const d = Math.hypot(x - lx, y - ly);
      for (let k = 0; k < Math.min(4, Math.floor(d / 9)); k++) spark(lx + ((x - lx) * k) / 4, ly + ((y - ly) * k) / 4, 6 + Math.random() * 14);
      if (d >= 9) { lx = x; ly = y; }
    };
    const onDown = () => {
      down = true;
      if (!still) for (let k = 0; k < 12; k++) spark(x, y, 60 + Math.random() * 90);
    };
    const onUp = () => { down = false; };
    const onLeave = () => { el.style.opacity = '0'; };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!still) spin += dt * (hot ? 140 : 40);
      const scale = (hot ? 1.6 : 1) * (down ? 0.75 : 1);
      el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${spin}deg) scale(${scale})`;

      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = motes.length - 1; i >= 0; i--) {
        const m = motes[i];
        m.life -= dt * 1.5;
        if (m.life <= 0) { motes.splice(i, 1); continue; }
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        m.vx *= 0.94;
        m.vy *= 0.94;
        ctx.globalAlpha = m.life;
        ctx.fillStyle = m.colour;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.size * m.life, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(frame);

    addEventListener('pointermove', onMove, { passive: true });
    addEventListener('pointerdown', onDown);
    addEventListener('pointerup', onUp);
    document.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener('resize', size);
      removeEventListener('pointermove', onMove);
      removeEventListener('pointerdown', onDown);
      removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerleave', onLeave);
      root.classList.remove('star-cursor');
    };
  }, []);

  return (
    <>
      <canvas className="cursor-dust" ref={dust} aria-hidden="true" />
      <div className="cursor-star" ref={star} aria-hidden="true">
        <svg viewBox="-12 -12 24 24" width="24" height="24">
          <path d="M0-12C.9-3.6 3.6-.9 12 0 3.6.9.9 3.6 0 12-.9 3.6-3.6.9-12 0-3.6-.9-.9-3.6 0-12Z" />
        </svg>
      </div>
    </>
  );
}
