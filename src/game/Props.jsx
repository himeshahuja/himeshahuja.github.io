import { toRectsWith } from './pixels.js';

const COIN_ROWS = [
  '..KKKK..',
  '.KGGGGK.',
  'KGGLLGGK',
  'KGGLGGGK',
  'KGGLGGGK',
  'KGGGGGGK',
  '.KGGGGK.',
  '..KKKK..',
];
const COIN_PALETTE = { K: '#8a5a1e', G: '#ffcd75', L: '#f4f4f4' };
const COIN = toRectsWith(COIN_ROWS, COIN_PALETTE);

// Rects as [x, y, w, h, paint]; a paint starting with "." is a class name, so
// CSS can light it up or animate it.
const paint = (fill) => (fill.startsWith('.') ? { className: fill.slice(1) } : { fill });
const Rects = ({ list }) => list.map(([x, y, w, h, fill], i) => <rect key={i} x={x} y={y} width={w} height={h} {...paint(fill)} />);

export function Coin({ className = '' }) {
  return (
    <svg className={`coin ${className}`} viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true">
      {COIN.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height="1" fill={r.fill} />)}
    </svg>
  );
}

// An arcade cabinet whose screen is the project's real screenshot.
export function Cabinet({ project, body }) {
  return (
    <div className="cabinet" style={{ '--body': body }}>
      <div className="cabinet__marquee" aria-hidden="true">{project.title}</div>
      <a className="cabinet__screen" href={project.play} target="_blank" rel="noreferrer" tabIndex={-1} aria-hidden="true">
        <img src={project.image} alt="" decoding="async" />
      </a>
      <div className="cabinet__panel" aria-hidden="true">
        <span className="cabinet__stick" />
        <span className="cabinet__btn" />
        <span className="cabinet__btn cabinet__btn--b" />
      </div>
      <div className="cabinet__base" aria-hidden="true">
        <span className="cabinet__slot" />
        <span className="cabinet__slot" />
      </div>
    </div>
  );
}

// Room above the roofline for the rooftop clutter.
const ROOF = 9;

// An office block for each job. Its windows and lobby light up, one by one,
// when the player arrives, and the checkpoint flag beside it runs up the pole.
export function Building({ name, floors, seed }) {
  const cols = 3;
  const w = 30;
  const h = 14 + floors * 7;
  const windows = [];
  for (let f = 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      windows.push({ x: 6 + c * 8, y: 5 + f * 7, delay: ((f * 7 + c * 3 + seed * 5) % 11) * 70 });
    }
  }
  const roof = seed % 2 === 0
    ? [[22, -8, 1, 8, '#566c86'], [20, -5, 5, 1, '#566c86'], [21, -9, 3, 2, '.beacon']]
    : [[18, -7, 8, 5, '#3d4766'], [18, -8, 8, 1, '#566c86'], [19, -2, 1, 2, '#262c47'], [24, -2, 1, 2, '#262c47']];
  return (
    <div className="building" style={{ '--rows': h + ROOF, '--roof': ROOF }}>
      <svg className="flag" viewBox="0 0 14 60" shapeRendering="crispEdges" aria-hidden="true">
        <rect x="1" y="2" width="2" height="58" fill="#94b0c2" />
        <rect x="2" y="2" width="1" height="58" fill="#c9dceb" />
        <rect x="0" y="0" width="4" height="3" fill="#ffcd75" />
        <g className="flag__cloth">
          <rect x="3" y="44" width="10" height="7" fill="#ef7d57" />
          <rect x="3" y="44" width="10" height="1" fill="#ffab7a" />
          <rect x="3" y="51" width="7" height="1" fill="#b13e53" />
          <rect x="6" y="46" width="3" height="3" fill="#ffcd75" />
        </g>
      </svg>
      <div className="building__body">
        <div className="building__sign" aria-hidden="true">{name}</div>
        <svg className="building__block" viewBox={`0 ${-ROOF} ${w} ${h + ROOF}`} shapeRendering="crispEdges" aria-hidden="true">
          <Rects list={roof} />
          <Rects list={[[3, -3, 8, 3, '#2b3150'], [4, -2, 2, 1, '#566c86'], [7, -2, 2, 1, '#566c86']]} />
          <rect x="0" y="0" width={w} height={h} fill="#333c57" />
          <rect x="0" y="0" width={w} height="2" fill="#566c86" />
          <rect x="0" y="2" width="3" height={h - 2} fill="#29366f" />
          <rect x={w - 1} y="2" width="1" height={h - 2} fill="#3d4766" />
          {windows.map((win, i) => (
            <g key={i}>
              <rect className="win" x={win.x} y={win.y} width="4" height="4" style={{ transitionDelay: `${win.delay}ms` }} />
              <rect x={win.x} y={win.y + 4} width="4" height="1" fill="#4a5675" />
            </g>
          ))}
          {/* The entrance: a striped awning over a lobby that lights up. */}
          <rect x="0" y={h - 12} width={w} height="1" fill="#29366f" />
          {Array.from({ length: 7 }, (_, i) => (
            <rect key={i} x={8 + i * 2} y={h - 10} width="2" height="2" fill={i % 2 ? '#f4f4f4' : '#ef7d57'} />
          ))}
          <rect x="8" y={h - 8} width="14" height="1" fill="#14152a" />
          <rect x="10" y={h - 7} width="10" height="7" fill="#14152a" />
          <rect className="lobby" x="11" y={h - 6} width="8" height="6" />
          <rect x="15" y={h - 6} width="1" height="6" fill="#14152a" />
        </svg>
      </div>
    </div>
  );
}

const CASTLE = [
  // [x, y, w, h, paint]
  [0, 14, 14, 50, '#566c86'], [50, 14, 14, 50, '#566c86'],
  [0, 10, 3, 4, '#566c86'], [5, 10, 4, 4, '#566c86'], [11, 10, 3, 4, '#566c86'],
  [50, 10, 3, 4, '#566c86'], [55, 10, 4, 4, '#566c86'], [61, 10, 3, 4, '#566c86'],
  [10, 28, 44, 36, '#94b0c2'],
  [10, 24, 4, 4, '#94b0c2'], [18, 24, 4, 4, '#94b0c2'], [42, 24, 4, 4, '#94b0c2'], [50, 24, 4, 4, '#94b0c2'],
  [20, 6, 24, 58, '#94b0c2'],
  [20, 2, 4, 4, '#94b0c2'], [28, 2, 8, 4, '#94b0c2'], [40, 2, 4, 4, '#94b0c2'],
  [41, 6, 3, 58, '#566c86'],
  [26, 46, 12, 18, '#14152a'], [28, 44, 8, 2, '#14152a'],
  [31, 46, 2, 18, '#333c57'],
  [6, 22, 2, 6, '#14152a'], [56, 22, 2, 6, '#14152a'],
  [26, 16, 3, 7, '#ffcd75'], [35, 16, 3, 7, '#ffcd75'],
  [6, 40, 2, 6, '#14152a'], [56, 40, 2, 6, '#14152a'],
  [31, -30, 2, 32, '#f4f4f4'], [30, -32, 4, 3, '#ffcd75'],
  // Stonework: a few lit and shadowed blocks so the walls read as stone.
  [2, 18, 3, 1, '#4a5d75'], [9, 31, 3, 1, '#4a5d75'], [2, 50, 3, 1, '#4a5d75'], [9, 57, 3, 1, '#4a5d75'],
  [52, 18, 3, 1, '#4a5d75'], [59, 31, 3, 1, '#4a5d75'], [52, 50, 3, 1, '#4a5d75'], [59, 57, 3, 1, '#4a5d75'],
  [22, 12, 3, 1, '#b8cad8'], [37, 26, 3, 1, '#b8cad8'], [23, 34, 3, 1, '#7f9ab0'], [14, 38, 3, 1, '#7f9ab0'],
  [45, 34, 3, 1, '#7f9ab0'], [15, 52, 3, 1, '#7f9ab0'], [46, 56, 3, 1, '#7f9ab0'], [36, 40, 3, 1, '#7f9ab0'],
  [26, 15, 3, 1, '#c4602d'], [35, 15, 3, 1, '#c4602d'],
  // Banners on the towers.
  [4, 28, 6, 8, '#b13e53'], [4, 36, 2, 2, '#b13e53'], [8, 36, 2, 2, '#b13e53'], [6, 30, 2, 3, '#ffcd75'], [4, 28, 6, 1, '#d0475c'],
  [54, 28, 6, 8, '#b13e53'], [54, 36, 2, 2, '#b13e53'], [58, 36, 2, 2, '#b13e53'], [56, 30, 2, 3, '#ffcd75'], [54, 28, 6, 1, '#d0475c'],
  // Torches either side of the gate.
  [22, 42, 1, 4, '#333c57'], [41, 42, 1, 4, '#333c57'], [21, 39, 3, 3, '.torch'], [40, 39, 3, 3, '.torch'],
];

export function Castle({ flagRef }) {
  return (
    <svg className="castle" viewBox="0 -34 64 98" shapeRendering="crispEdges" aria-hidden="true">
      <Rects list={CASTLE} />
      <g ref={flagRef} className="castle__flag">
        <rect x="33" y="-2" width="14" height="9" fill="#ef7d57" />
        <rect x="33" y="-2" width="14" height="1" fill="#ffab7a" />
        <rect x="33" y="7" width="9" height="1" fill="#b13e53" />
        <rect x="37" y="0" width="2" height="5" fill="#f4f4f4" />
        <rect x="39" y="3" width="2" height="2" fill="#f4f4f4" />
        <rect x="41" y="0" width="2" height="5" fill="#f4f4f4" />
      </g>
    </svg>
  );
}

// Street furniture between the stops: lamps that switch on as they come into
// view, hydrants, bins and mailboxes.
const STREET = {
  lamp: [16, 64, [
    [0, 5, 16, 8, '.lamp__glow'], [2, 3, 12, 12, '.lamp__glow'],
    [5, 1, 6, 2, '#262c47'], [3, 3, 10, 3, '#333c57'], [3, 3, 10, 1, '#4a5675'],
    [4, 6, 8, 3, '.lamp__light'], [3, 9, 10, 1, '#262c47'],
    [7, 10, 2, 46, '#333c57'], [8, 10, 1, 46, '#4a5675'], [6, 28, 4, 2, '#262c47'],
    [5, 56, 6, 3, '#262c47'], [4, 59, 8, 5, '#1d2135'], [5, 59, 6, 1, '#333c57'],
  ]],
  hydrant: [10, 14, [
    [3, 0, 4, 1, '#7a2a3a'], [2, 1, 6, 2, '#b13e53'], [1, 3, 8, 1, '#7a2a3a'],
    [2, 4, 6, 8, '#b13e53'], [6, 4, 1, 8, '#d0475c'], [2, 4, 1, 8, '#7a2a3a'],
    [0, 6, 2, 2, '#b13e53'], [8, 6, 2, 2, '#b13e53'], [4, 7, 2, 2, '#ffcd75'], [1, 12, 8, 2, '#7a2a3a'],
  ]],
  trash: [12, 16, [
    [5, 0, 2, 1, '#262c47'], [1, 1, 10, 2, '#566c86'], [1, 1, 10, 1, '#7f9ab0'],
    [2, 3, 8, 12, '#333c57'], [3, 4, 1, 10, '#4a5675'], [6, 4, 1, 10, '#4a5675'], [8, 4, 1, 10, '#262c47'],
    [2, 15, 8, 1, '#1d2135'],
  ]],
  mailbox: [12, 20, [
    [1, 0, 10, 2, '#3b5dc9'], [0, 2, 12, 9, '#3b5dc9'], [0, 2, 1, 9, '#29366f'], [10, 2, 1, 9, '#5b7de9'],
    [3, 4, 6, 1, '#14152a'], [3, 7, 6, 2, '#f4f4f4'], [5, 11, 2, 9, '#262c47'], [6, 11, 1, 9, '#333c57'],
  ]],
};

export function StreetProp({ kind }) {
  const [w, h, list] = STREET[kind];
  return (
    <svg className={`decor decor--${kind}`} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden="true">
      <Rects list={list} />
    </svg>
  );
}

// A bonus block above each signpost. Clicking it knocks a coin out; it is a
// toy for the mouse, so it stays out of the tab order and the accessibility tree.
export function QuestionBlock({ onBump }) {
  const bump = (e) => {
    const el = e.currentTarget;
    el.classList.remove('is-bumped');
    void el.offsetWidth; // restart the bump
    el.classList.add('is-bumped');
    onBump?.(el);
  };
  return (
    <span className="qblock" onClick={bump} data-sfx="bump" aria-hidden="true">
      <span className="qblock__face">?</span>
      <Coin className="qblock__coin" />
    </span>
  );
}

// Bursts over the castle once the level is cleared.
export function Fireworks() {
  return (
    <div className="fireworks" aria-hidden="true">
      {[0, 1, 2].map((b) => (
        <span key={b} className="firework" style={{ '--b': b }}>
          {Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--a': `${i * 30}deg` }} />)}
        </span>
      ))}
    </div>
  );
}

export function Signpost({ id, children }) {
  return (
    <div className="signpost">
      <h2 id={id} className="signpost__board">{children}</h2>
      <div className="signpost__post" aria-hidden="true" />
    </div>
  );
}
