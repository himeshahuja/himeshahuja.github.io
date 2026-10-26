// The player sprite: a 24 x 34 grid per frame, drawn by hand and facing right.
// Each letter is one pixel; "." is empty.

export const SPRITE_W = 24;
export const SPRITE_H = 34;

export const PALETTE = {
  K: '#14152a', // outline
  H: '#2b2118', // hair
  h: '#4f3a28', // hair highlight
  S: '#b9825a', // skin
  s: '#93623f', // skin shade
  W: '#f4f4f4', // eye
  D: '#262b44', // headphones
  d: '#566c86', // headphone shine
  G: '#ef7d57', // headphone logo, backpack, shoe stripe
  g: '#b13e53', // backpack shade
  Y: '#ffcd75', // zip, watch and buckle
  T: '#dbe8ee', // shirt
  B: '#9fbccb', // sleeves
  C: '#6f8ea3', // collar, seams and buttons
  L: '#4a2f1f', // belt
  P: '#3a4466', // near leg
  p: '#2c3452', // near leg shade
  j: '#4f5d8a', // near leg light
  Q: '#262c47', // far leg
  q: '#1c2139', // far leg shade
  t: '#f4f9fc', // shirt light
  r: '#d6a06f', // skin light
  O: '#f4f4f4', // shoes
  A: '#c4602d', // soles
};

// Over-ear headphones: the band runs over the crown into a cup on the ear.
const HEAD = [
  '..........KKKKKK........',
  '........KKDDKHHHKK......',
  '.......KHHDdKHhhhHHKK...',
  '......KHHHDdHHHHhhHHHK..',
  '.....KHHHHDdHHHHHHHHHHK.',
  '.....KHHHKDdKHHHHHHHHHHK',
  '....KHHHKDDdDKHHHHSSHSHK',
  '....KHHKDdGGDDKHSSSKKSK.',
  '....KHHKDdGGDDKSSSSWKSK.',
  '....KHHKDdDDDDKSSSSWKSSK',
  '....KHHKDdDDDDKSSSSSSSSK',
  '.....KHKDDDDKsSSSSSSKK..',
  '......KKKKKKsSSSSSKSK...',
  '.......KHsSSSSSSSKK.....',
  '.........KKsSSSKK.......',
];

const SHOULDERS = '...KKKKKKKKKCCTTTCCKK...';
const BELT = '....KKKKKLLLLLLLLLLYLK..';

const TORSO_REST = [
  SHOULDERS,
  '...KGGGGGKGTTCBBKTTTTK..',
  '...KGgggGKTGTCBBKTCTTK..',
  '...KGgYgGKTTGCBBKTTTTK..',
  '...KGgggGKTTTCBBKTCTTK..',
  '...KGGGGGKTTTCBBKTTTTK..',
  '...KgGGGgKTTTCSSKTCTTK..',
  '...KKgggKKTTTCYSKTTTTK..',
  '....KKKKKLLLLKSSKLLYLK..',
];

// Near arm pumped forward, elbow bent.
const TORSO_FORWARD = [
  SHOULDERS,
  '...KGGGGGKGTTTTCBBKTTK..',
  '...KGgggGKTGTTTCBBBKKKK.',
  '...KGgYgGKTTGTTTCBBYSSK.',
  '...KGgggGKTTTGTTTTKKKKK.',
  '...KGGGGGKTTTTGTCTTTTK..',
  '...KgGGGgKTTTTTTTTTCTK..',
  '...KKgggKKTTTTTTTTTTTK..',
  BELT,
];

// Near arm swung back across the backpack.
const TORSO_BACK = [
  SHOULDERS,
  '...KGGGGGKGTTCBBKTTTTK..',
  '...KGgggGKKBBBKTCTTTTK..',
  '...KGgYKBBBKTTTTTTTTTK..',
  '...KGgKSSYKTTTTTCTTTTK..',
  '..KSSKGGGKTTTTTTTTTTTK..',
  '...KKgGGgKTTTTTTTTTCTK..',
  '...KKgggKKTTTTTTTTTTTK..',
  BELT,
];

// Arm on its way through, between the two swings.
const TORSO_PASS = [...TORSO_REST.slice(0, 8), BELT];

const LEGS_STAND = [
  '.........KQQQQKKPPPPPK..',
  '.........KQQQQKPPPPPPK..',
  '.........KQQQQKPPPPPPK..',
  '..........KQQQKPPPPPK...',
  '..........KQQQKPPPPPK...',
  '..........KQQQKPPPPPK...',
  '.........KOOOOKOOOOOOK..',
  '.........KOOGOKOOGGOOK..',
  '.........KAAAAKAAAAAAK..',
  '.........KKKKKKKKKKKKK..',
];

const HIPS = '.........KPPPPPPPPPPPK..';

// Stride: one leg reaching forward, the other pushing back.
const strideLegs = (b, f) => [
  HIPS,
  `........K${b.repeat(5)}K${f.repeat(5)}K...`,
  `.......K${b.repeat(4)}K...K${f.repeat(4)}K..`,
  `......K${b.repeat(4)}K.....K${f.repeat(4)}K.`,
  `.....K${b.repeat(3)}K........K${f.repeat(3)}K.`,
  `....K${b.repeat(3)}K.........K${f.repeat(3)}K.`,
  `...K${b.repeat(3)}K.........KOOOOOK`,
  '..KOOOOK.........KOGGOOK',
  '..KAAAAK.........KAAAAAK',
  '..KKKKKK.........KKKKKKK',
];

// Passing: one foot planted, the other knee driving through.
const passLegs = (p, l) => [
  HIPS,
  `.........K${p.repeat(4)}${l.repeat(6)}K...`,
  `.........K${p.repeat(4)}K${l.repeat(6)}K..`,
  `.........K${p.repeat(4)}K...K${l.repeat(3)}K.`,
  `.........K${p.repeat(4)}K...K${l.repeat(3)}K.`,
  `..........K${p.repeat(3)}K.KOOGOOK.`,
  `..........K${p.repeat(3)}K.KAAAAAK.`,
  '.........KOOGOOK..KKKKK.',
  '.........KAAAAAK........',
  '.........KKKKKKK........',
];

const LEGS_JUMP = [
  HIPS,
  '........KQQQQQKPPPPPPK..',
  '.......KQQQQK.KPPPPPK...',
  '.......KOOGOK..KOOGOOK..',
  '.......KAAAAK..KAAAAAK..',
  '.......KKKKKK..KKKKKKK..',
  '........................',
  '........................',
  '........................',
  '........................',
];

// Light falls from the front: the legs take a shadow on their back edge and a
// rim of light on their front one, and the shirt and skin catch the light
// where they meet the outline ahead of them. Run over every frame, so the
// shading follows each pose.
const LIGHT = {
  P: { back: 'p', front: 'j' },
  Q: { back: 'q' },
  T: { front: 't' },
  S: { front: 'r' },
};
const edge = (c) => c === 'K' || c === '.' || c === undefined;

function light(rows) {
  return rows.map((row) => [...row].map((c, x) => {
    const rule = LIGHT[c];
    if (!rule) return c;
    if (rule.back && edge(row[x - 1])) return rule.back;
    if (rule.front && edge(row[x + 1])) return rule.front;
    return c;
  }).join(''));
}

export const FRAMES = Object.fromEntries(Object.entries({
  idle: [...HEAD, ...TORSO_REST, ...LEGS_STAND],
  run1: [...HEAD, ...TORSO_FORWARD, ...strideLegs('Q', 'P')],
  run2: [...HEAD, ...TORSO_PASS, ...passLegs('Q', 'P')],
  run3: [...HEAD, ...TORSO_BACK, ...strideLegs('P', 'Q')],
  run4: [...HEAD, ...TORSO_PASS, ...passLegs('P', 'Q')],
  jump: [...HEAD, ...TORSO_FORWARD, ...LEGS_JUMP],
}).map(([name, rows]) => [name, light(rows)]));

// Drawn over any frame now and then: the eye closes for a blink.
export const BLINK = [{ x: 19, y: 8, w: 2, fill: PALETTE.S }, { x: 19, y: 9, w: 2, fill: PALETTE.K }];

export const RUN_CYCLE = ['run1', 'run2', 'run3', 'run4'];
