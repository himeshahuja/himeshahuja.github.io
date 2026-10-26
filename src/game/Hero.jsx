import { forwardRef } from 'react';
import { BLINK, FRAMES, PALETTE, SPRITE_W, SPRITE_H } from './sprite.js';
import { toRectsWith } from './pixels.js';

const DRAWN = Object.entries(FRAMES).map(([name, rows]) => [name, toRectsWith(rows, PALETTE)]);

// Every frame is in the SVG; CSS shows the one named by data-frame, so the
// game loop changes a single attribute per step instead of re-rendering.
const Hero = forwardRef(function Hero({ className = '', frame = 'idle' }, ref) {
  return (
    <svg
      ref={ref}
      className={`hero ${className}`}
      data-frame={frame}
      viewBox={`0 0 ${SPRITE_W} ${SPRITE_H}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      {DRAWN.map(([name, rects]) => (
        <g key={name} data-f={name}>
          {rects.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height="1" fill={r.fill} />)}
        </g>
      ))}
      <g className="hero__blink">
        {BLINK.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height="1" fill={r.fill} />)}
      </g>
    </svg>
  );
});

export default Hero;
