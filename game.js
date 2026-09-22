'use strict';
(function () {
// ============================================================ CONFIG
const N = 2000;
const WORLD = { w: 3000, h: 2000 };
const MARGIN = 30;            // puppies keep this far from the fence
const PET_ZOOM = 1.6;         // at this zoom the hand pets instead of shoos
const MAX_ZOOM = 7;
const CELL = 48;
const TAU = Math.PI * 2;
const DAY_MS = 86400000;
const G = 900;                // gravity for the ball
const SHOO_PX = 90;           // shoo radius on screen
const CALL_PX = 260;          // call radius on screen

// ============================================================ UTILS
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const easeInOut = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
const $ = id => document.getElementById(id);
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function shuffle(arr, r) {
  for (let i = arr.length - 1; i > 0; i--) { const j = (r() * (i + 1)) | 0; [arr[i], arr[j]] = [arr[j], arr[i]]; }
  return arr;
}
function mix(a, b, t) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const c = [16, 8, 0].map(s => Math.round(lerp((pa >> s) & 255, (pb >> s) & 255, t)));
  return '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
}
const store = {
  get(k, d) { try { const v = localStorage.getItem('tkp.' + k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('tkp.' + k, v); } catch (e) { } },
  del(k) { try { localStorage.removeItem('tkp.' + k); } catch (e) { } }
};
function fmtNum(n) { return n.toLocaleString('en-US'); }

// ============================================================ DATES
function parseDate(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
  return isNaN(d) ? null : d;
}
function todayUTC() { const d = new Date(); return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12)); }
function ymd(d) { return d.toISOString().slice(0, 10); }
function fmtDate(d) { return d.toLocaleDateString(undefined, { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }); }
function ageParts(a, b) {
  let y = b.getUTCFullYear() - a.getUTCFullYear();
  let m = b.getUTCMonth() - a.getUTCMonth();
  let d = b.getUTCDate() - a.getUTCDate();
  if (d < 0) { m--; d += new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0)).getUTCDate(); }
  if (m < 0) { y--; m += 12; }
  return { y, m, d };
}

// ============================================================ SETTINGS
const params = new URLSearchParams(location.search);
let kidName = (params.get('name') || store.get('name', '')).trim();
let birthday = parseDate(params.get('birthday')) || parseDate(store.get('bday', '')) || new Date(todayUTC().getTime() - 1999 * DAY_MS);
const dayDate = n => new Date(birthday.getTime() + (n - 1) * DAY_MS);

// ============================================================ NAMES & LOOKS
const NAMES = ('Biscuit Waffles Pancake Maple Peanut Mochi Noodle Pickles Sprinkles Cupcake Muffin Cookie Bean Pudding ' +
  'Marshmallow Honey Buttons Pebble Clover Daisy Poppy Rosie Lily Tulip Willow Hazel Olive Pepper Ginger Cinnamon Nutmeg ' +
  'Cocoa Fudge Brownie Toffee Caramel Butterscotch Jellybean Gumdrop Lollipop Bubbles Fizz Ziggy Zoom Dash Rocket Comet ' +
  'Star Twinkle Sunny Sky Cloud Rain Snowy Frosty Winter Summer Autumn Meadow River Brook Ocean Sandy Coral Pearl Ruby ' +
  'Jade Amber Goldie Silver Copper Penny Nickel Lucky Charm Magic Pixie Fairy Dragon Puff Fluffy Fuzzy Wiggles Giggles ' +
  'Tickles Nibbles Snuggles Cuddles Huggy Smiley Happy Jolly Merry Joy Peaches Plum Berry Cherry Apple Mango Kiwi Lemon ' +
  'Lime Coconut Banana Melon Pumpkin Tater Spud Fries Pretzel Bagel Donut Churro Taco Nacho Burrito Pizza Pasta Ravioli ' +
  'Gnocchi Dumpling Wonton Sushi Miso Tofu Boba Latte Mocha Chai Milo Otis Oscar Ollie Archie Alfie Teddy Freddie Charlie ' +
  'Buddy Max Sam Toby Benji Bailey Bella Luna Lola Molly Millie Coco Ellie Tilly Nala Winnie Maggie Sadie Zoe Piper Hattie ' +
  'Dottie Patches Spot Freckles Speckle Domino Oreo Panda Socks Mittens Boots Scout Ranger Bear Moose Wolfie Foxy Bunny ' +
  'Duckie Goose Kitty Piglet Lamb Tigger Simba Nemo Dory Stitch Yoshi Kirby Sonic Peach Toad Elsa Anna Olaf Moana Ariel ' +
  'Belle Jasmine Aurora Tiana Merida Doodle Scribble Squiggle Wobble Bounce Skip Hop Tumble Twirl Spin Zip Zap Bolt Flash ' +
  'Sparky Blaze Ember Smokey Ash Shadow Midnight Dusk Dawn Sunrise Sunset Pippa Poppet Button Truffle Snickers Skittles ' +
  'Rolo Twix Kitkat Wafer Crumpet Scone Cheerio Pudsey Basil Parsley Sage Rosemary Thyme Juniper Ivy Fern Moss Acorn ' +
  'Chestnut Walnut Almond Cashew Pistachio Sesame Poppyseed Mango Guava Papaya Lychee Tango Rumba Salsa Disco Jazz ' +
  'Bongo Banjo Fiddle Piccolo Bugle Trumpet Harmony Melody Lyric Rhythm Cadence Tempo Whistle Echo Yodel Chirp Tweet').split(' ');

const LOOKS = [
  { fur: '#e8b86d', dark: '#c9954a', light: '#f7e1b5' },                                   // golden
  { fur: '#f3e3c3', dark: '#d9c39a', light: '#fff7e6' },                                   // cream
  { fur: '#7a4a2a', dark: '#5a3419', light: '#b98a62' },                                   // chocolate
  { fur: '#3a3a3a', dark: '#1f1f1f', light: '#8a7a70' },                                   // black
  { fur: '#fafafa', dark: '#d8d8d8', light: '#ffffff' },                                   // white
  { fur: '#9a9a9a', dark: '#6e6e6e', light: '#dcdcdc' },                                   // grey
  { fur: '#d99a5b', dark: '#3b2a20', light: '#fff2dc', pattern: 'patch' },                 // beagle
  { fur: '#fafafa', dark: '#333333', light: '#ffffff', pattern: 'spots', spot: '#222222' }, // dalmatian
  { fur: '#e0893a', dark: '#c0702a', light: '#fff8ee', pattern: 'belly' },                 // corgi
  { fur: '#b9bcc4', dark: '#5b5f6b', light: '#ffffff', pattern: 'mask' },                  // husky
  { fur: '#c96b3f', dark: '#a0522d', light: '#f3d3b8' },                                   // red setter
  { fur: '#f0d9b5', dark: '#e2b07a', light: '#ffffff', pattern: 'spots', spot: '#b5793f' } // spotted tan
];
LOOKS.forEach(L => { L.mid = mix(L.fur, L.dark, 0.5); L.dot = L.pattern === 'spots' ? mix(L.fur, L.spot, 0.3) : L.fur; });
const COLLARS = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00acc1', '#ff6fa3', '#fdd835'];

// ============================================================ PUPPY DRAWING
// Local units: body center at origin, ground at y = 13, faces +x.
const POSES = ['stand', 'walk1', 'walk2', 'sit', 'happy', 'sleep', 'eat'];
const P_STAND = 0, P_WALK1 = 1, P_WALK2 = 2, P_SIT = 3, P_HAPPY = 4, P_SLEEP = 5, P_EAT = 6;
const GEOM = {
  stand: { body: [-3, 0, 13, 9], head: [10, -7, 9.5], legs: [[-10, 5, 8], [-4, 5, 8], [3, 5, 8], [8, 5, 8]], tail: [-14, -3, 0.9], eyes: 'open', collar: [4.5, -1] },
  walk1: { body: [-3, -1, 13, 9], head: [10, -8, 9.5], legs: [[-11, 4, 9], [-3, 4, 7], [2, 4, 7], [9, 4, 9]], tail: [-14, -4, 0.7], eyes: 'open', collar: [4.5, -2] },
  walk2: { body: [-3, -1, 13, 9], head: [10, -8, 9.5], legs: [[-9, 4, 7], [-5, 4, 9], [4, 4, 9], [7, 4, 7]], tail: [-14, -4, 1.1], eyes: 'open', collar: [4.5, -2] },
  sit: { body: [-3, 2, 10, 10.5], haunch: [-8, 6, 6.5], head: [9, -9, 9.5], legs: [[2, 3, 10], [7, 3, 10]], tail: [-12, 9, 0.15], eyes: 'open', collar: [3.5, -1.5] },
  happy: { body: [-3, 2, 10, 10.5], haunch: [-8, 6, 6.5], head: [9, -9, 9.5], legs: [[2, 3, 10], [7, 3, 10]], tail: [-12, 9, 0.3], eyes: 'happy', blush: true, tongue: true, collar: [3.5, -1.5] },
  sleep: { body: [-2, 5, 14, 7], head: [11, 1, 9], legs: [[-10, 9, 4], [6, 9, 4]], tail: [-15, 7, -0.2], eyes: 'closed', collar: [5, 2] },
  eat: { body: [-3, 0, 13, 9], head: [12, -2, 9.5], legs: [[-10, 5, 8], [-4, 5, 8], [3, 5, 8], [8, 5, 8]], tail: [-14, -3, 0.6], eyes: 'open', collar: [5, 0] }
};
function ell(g, x, y, rx, ry, rot, color) { g.fillStyle = color; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill(); }
function circ(g, x, y, r, color) { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
function leg(g, x, top, len, color) {
  g.strokeStyle = color; g.lineWidth = 5.5; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x, top + 2.5); g.lineTo(x, top + len - 2.7); g.stroke();
}
function drawPuppy(g, L, poseName, o) {
  const Gm = GEOM[poseName];
  const wag = o.wag || 0, ex = o.ex || 0, ey = o.ey || 0;
  const [bx, by, brx, bry] = Gm.body;
  const [hx, hy, hr] = Gm.head;
  // tail
  const [tx, ty, ta] = Gm.tail; const a = ta + wag;
  g.strokeStyle = L.dark; g.lineWidth = 4; g.lineCap = 'round';
  g.beginPath(); g.moveTo(tx, ty);
  g.quadraticCurveTo(tx - 5 * Math.cos(a), ty - 5 * Math.sin(a) - 2.5, tx - 10 * Math.cos(a), ty - 10 * Math.sin(a));
  g.stroke();
  // far ear
  ell(g, hx - 7.5, hy + 2, 3.2, 6.2, -0.25, L.dark);
  // back legs
  if (Gm.legs.length === 4) { leg(g, Gm.legs[0][0], Gm.legs[0][1], Gm.legs[0][2], L.mid); leg(g, Gm.legs[1][0], Gm.legs[1][1], Gm.legs[1][2], L.mid); }
  // body
  ell(g, bx, by, brx, bry, 0, L.fur);
  if (L.pattern === 'patch') ell(g, bx - 2, by - 4, 7, 4, 0, L.dark);
  if (L.pattern === 'belly') ell(g, bx + 2, by + 4, 8, 3.8, 0, L.light);
  if (L.pattern === 'mask') ell(g, bx - 1, by - 4, 9, 4, 0, L.dark);
  if (L.pattern === 'spots') {
    circ(g, bx - 6, by - 3, 2.2, L.spot); circ(g, bx + 1, by + 2, 1.8, L.spot);
    circ(g, bx - 2, by + 5, 1.4, L.spot); circ(g, bx + 6, by - 4, 1.6, L.spot);
  }
  if (Gm.haunch) circ(g, Gm.haunch[0], Gm.haunch[1], Gm.haunch[2], L.fur);
  // front legs
  const fl = Gm.legs.length === 4 ? Gm.legs.slice(2) : Gm.legs;
  fl.forEach(l => leg(g, l[0], l[1], l[2], L.fur));
  // collar
  if (o.collar) {
    ell(g, Gm.collar[0], Gm.collar[1], 2.4, 6.8, -0.35, o.collar);
    circ(g, Gm.collar[0] + 1.6, Gm.collar[1] + 6.2, 1.4, '#ffd54f');
  }
  // head
  circ(g, hx, hy, hr, L.fur);
  if (L.pattern === 'mask') { ell(g, hx - 1, hy - 4, 8.5, 5.5, 0, L.dark); circ(g, hx + 4, hy + 2, 6, L.light); }
  if (L.pattern === 'spots') circ(g, hx - 2, hy - 4, 1.7, L.spot);
  if (L.pattern === 'patch') ell(g, hx - 2, hy - 5, 6, 4, 0, L.dark);
  // near ear
  ell(g, hx - 4.5, hy + 1, 3.6, 7, -0.3, L.dark);
  // snout, nose, mouth
  ell(g, hx + 6.5, hy + 2.5, 5.2, 3.9, 0, L.light);
  circ(g, hx + 10, hy + 0.8, 1.9, '#2b1a12');
  g.strokeStyle = '#2b1a12'; g.lineWidth = 0.8;
  g.beginPath(); g.arc(hx + 8.5, hy + 3.2, 1.6, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
  if (Gm.tongue) ell(g, hx + 8.5, hy + 5.4, 1.5, 2.2, 0, '#ff7aa2');
  // eyes
  if (Gm.eyes === 'open') {
    circ(g, hx + 2.5 + ex, hy - 2.5 + ey, 1.6, '#1b1b1b'); circ(g, hx + 7.8 + ex, hy - 3 + ey, 1.6, '#1b1b1b');
    circ(g, hx + 2 + ex, hy - 3 + ey, 0.55, '#fff'); circ(g, hx + 7.3 + ex, hy - 3.5 + ey, 0.55, '#fff');
  } else if (Gm.eyes === 'happy') {
    g.strokeStyle = '#1b1b1b'; g.lineWidth = 1.3; g.lineCap = 'round';
    g.beginPath(); g.arc(hx + 2.5, hy - 2, 1.8, Math.PI, TAU); g.stroke();
    g.beginPath(); g.arc(hx + 7.8, hy - 2.5, 1.8, Math.PI, TAU); g.stroke();
  } else {
    g.strokeStyle = '#1b1b1b'; g.lineWidth = 1.1; g.lineCap = 'round';
    g.beginPath(); g.moveTo(hx + 1, hy - 2.5); g.lineTo(hx + 4, hy - 2.5); g.moveTo(hx + 6.3, hy - 3); g.lineTo(hx + 9.3, hy - 3); g.stroke();
  }
  if (Gm.blush) circ(g, hx + 1.5, hy + 1.5, 1.9, 'rgba(255,110,150,0.45)');
}

// sprite cache: sprites[look][pose][facing(0 = right, 1 = left)]
const SPR = 96, SPR_SCALE = 2, SPR_OX = 48, SPR_OY = 50;
const sprites = [];
function makeSprites() {
  for (let l = 0; l < LOOKS.length; l++) {
    sprites[l] = [];
    for (let p = 0; p < POSES.length; p++) {
      sprites[l][p] = [];
      for (let f = 0; f < 2; f++) {
        const c = document.createElement('canvas'); c.width = c.height = SPR;
        const g = c.getContext('2d');
        g.translate(SPR_OX, SPR_OY); g.scale(SPR_SCALE * (f ? -1 : 1), SPR_SCALE);
        drawPuppy(g, LOOKS[l], POSES[p], {});
        sprites[l][p][f] = c;
      }
    }
  }
}

// ============================================================ PUPPIES
const puppies = new Array(N);
const shuffledNames = shuffle(NAMES.slice(), mulberry32(20000));
function makePuppies() {
  const pettedStr = store.get('petted', '');
  for (let i = 0; i < N; i++) {
    const r = mulberry32(1000 + i * 7919);
    puppies[i] = {
      i, x: rnd(MARGIN + 20, WORLD.w - MARGIN - 20), y: rnd(MARGIN + 20, WORLD.h - MARGIN - 20), vx: 0, vy: 0,
      look: (r() * LOOKS.length) | 0, size: 0.85 + r() * 0.3, name: shuffledNames[i % shuffledNames.length],
      collar: COLLARS[(r() * COLLARS.length) | 0], facing: r() < 0.5 ? 1 : -1,
      state: 'idle', t: r() * 4, tx: 0, ty: 0, obj: null, petted: pettedStr[i] === '1',
      anim: r() * 10, wag: r() * TAU, idlePose: r() < 0.4 ? 'sit' : 'stand', lastPet: -9, fx: 0, fy: 0
    };
    puppies[i].r = 13 * puppies[i].size;
  }
}
function savePetted() { let s = ''; for (let i = 0; i < N; i++) s += puppies[i].petted ? '1' : '0'; store.set('petted', s); }

// ============================================================ SPATIAL HASH
const GW = Math.ceil(WORLD.w / CELL) + 1, GH = Math.ceil(WORLD.h / CELL) + 1;
const heads = new Int32Array(GW * GH), nxt = new Int32Array(N);
function rebuildGrid() {
  heads.fill(-1);
  for (let i = 0; i < N; i++) {
    const p = puppies[i];
    const c = clamp((p.y / CELL) | 0, 0, GH - 1) * GW + clamp((p.x / CELL) | 0, 0, GW - 1);
    nxt[i] = heads[c]; heads[c] = i;
  }
}
function eachNear(x, y, r, fn) {
  const x0 = clamp(((x - r) / CELL) | 0, 0, GW - 1), x1 = clamp(((x + r) / CELL) | 0, 0, GW - 1);
  const y0 = clamp(((y - r) / CELL) | 0, 0, GH - 1), y1 = clamp(((y + r) / CELL) | 0, 0, GH - 1);
  const r2 = r * r;
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) {
    let i = heads[cy * GW + cx];
    while (i >= 0) { const p = puppies[i]; const dx = p.x - x, dy = p.y - y; if (dx * dx + dy * dy <= r2) fn(p, Math.sqrt(dx * dx + dy * dy)); i = nxt[i]; }
  }
}
function separate() {
  for (let i = 0; i < N; i++) {
    const p = puppies[i];
    const cx = clamp((p.x / CELL) | 0, 0, GW - 1), cy = clamp((p.y / CELL) | 0, 0, GH - 1);
    for (let yy = Math.max(0, cy - 1); yy <= Math.min(GH - 1, cy + 1); yy++)
      for (let xx = Math.max(0, cx - 1); xx <= Math.min(GW - 1, cx + 1); xx++) {
        let j = heads[yy * GW + xx];
        while (j >= 0) {
          if (j > i) {
            const q = puppies[j];
            let dx = q.x - p.x, dy = q.y - p.y;
            const min = p.r + q.r;
            let d2 = dx * dx + dy * dy;
            if (d2 < min * min) {
              if (d2 < 0.01) { dx = rnd(-1, 1); dy = rnd(-1, 1); d2 = dx * dx + dy * dy; }
              const d = Math.sqrt(d2), push = (min - d) * 0.25;
              const nx = dx / d, ny = dy / d;
              p.x -= nx * push; p.y -= ny * push; q.x += nx * push; q.y += ny * push;
            }
          }
          j = nxt[j];
        }
      }
  }
}

// ============================================================ CANVAS & CAMERA
const canvas = $('game'), ctx = canvas.getContext('2d');
const mini = $('minimap'), mctx = mini.getContext('2d');
let W = 1, H = 1, dpr = 1;
const cam = { x: WORLD.w / 2, y: WORLD.h / 2, zoom: 0.5 };
const camT = { x: WORLD.w / 2, y: WORLD.h / 2, zoom: 0.5 };
const HUD_BOTTOM = 84;        // toolbar height, kept clear when the whole world is shown
function minZoom() { return Math.min(W / (WORLD.w + 100), (H - HUD_BOTTOM) / (WORLD.h + 100)); }
function clampCam(c) {
  c.zoom = clamp(c.zoom, minZoom(), MAX_ZOOM);
  const vw = W / c.zoom, vh = (H - HUD_BOTTOM) / c.zoom;
  c.x = vw >= WORLD.w + 100 ? WORLD.w / 2 : clamp(c.x, vw / 2 - 50, WORLD.w - vw / 2 + 50);
  c.y = vh >= WORLD.h + 100 ? WORLD.h / 2 + HUD_BOTTOM / 2 / c.zoom : clamp(c.y, vh / 2 - 50, WORLD.h - vh / 2 + 50 + HUD_BOTTOM / c.zoom);
}
function toWorld(sx, sy) { return { x: (sx - W / 2) / cam.zoom + cam.x, y: (sy - H / 2) / cam.zoom + cam.y }; }
function zoomAt(sx, sy, z, snap) {
  z = clamp(z, minZoom(), MAX_ZOOM);
  const wx = (sx - W / 2) / camT.zoom + camT.x, wy = (sy - H / 2) / camT.zoom + camT.y;
  camT.zoom = z; camT.x = wx - (sx - W / 2) / z; camT.y = wy - (sy - H / 2) / z;
  clampCam(camT);
  if (snap) Object.assign(cam, camT);
}
function panBy(dx, dy) { camT.x -= dx / cam.zoom; camT.y -= dy / cam.zoom; clampCam(camT); cam.x = camT.x; cam.y = camT.y; }
function resize() {
  dpr = Math.min(2, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  clampCam(camT); clampCam(cam);
}
window.addEventListener('resize', resize);
const isPetMode = () => cam.zoom >= PET_ZOOM;
function playerPos() { return toWorld(W / 2, H - 90); }

// ============================================================ GAME STATE
let stats = { treats: 0, throws: 0, fetches: 0 };
try { Object.assign(stats, JSON.parse(store.get('stats', '{}'))); } catch (e) { }
function saveStats() { store.set('stats', JSON.stringify(stats)); }
let pettedCount = 0;
let tool = 'hand';
let formation = null;          // { kind, labels }
const treats = [];
const ball = { active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, state: 'rest', carrier: null, hx: 0, hy: 0 };
const parts = [];              // world-space particles
const confetti = [];           // screen-space particles
const callPoint = { type: 'point', x: 0, y: 0 };
let intro = null;
let visibleCount = 0;
let now = 0;
const flowers = [];
{ const r = mulberry32(77); const cols = ['#fff', '#ffe082', '#f8bbd0', '#b39ddb', '#ffab91'];
  for (let i = 0; i < 260; i++) flowers.push({ x: 40 + r() * (WORLD.w - 80), y: 40 + r() * (WORLD.h - 80), c: cols[(r() * cols.length) | 0], s: 3 + r() * 3 }); }

const isFree = p => p.state === 'idle' || p.state === 'wander' || p.state === 'flee' || p.state === 'happy';

// ============================================================ PUPPY BEHAVIOUR
function steer(p, dvx, dvy, k, dt) { const a = Math.min(1, k * dt); p.vx += (dvx - p.vx) * a; p.vy += (dvy - p.vy) * a; }
function damp(p, k, dt) { const f = Math.max(0, 1 - k * dt); p.vx *= f; p.vy *= f; }
function toIdle(p, t) {
  p.obj = null;
  if (formation) { p.state = 'form'; return; }
  p.state = 'idle'; p.t = t !== undefined ? t : rnd(1, 5); p.idlePose = Math.random() < 0.4 ? 'sit' : 'stand';
}
function pickWander(p) {
  const a = Math.random() * TAU, d = rnd(30, 140);
  p.tx = clamp(p.x + Math.cos(a) * d, MARGIN, WORLD.w - MARGIN);
  p.ty = clamp(p.y + Math.sin(a) * d, MARGIN, WORLD.h - MARGIN);
  p.state = 'wander'; p.t = 6;
}
function updatePuppy(p, dt) {
  switch (p.state) {
    case 'idle':
      p.t -= dt;
      if (p.t <= 0) {
        if (Math.random() < 0.06 && now - p.lastPet > 10) { p.state = 'sleep'; p.t = rnd(6, 16); }
        else pickWander(p);
      }
      break;
    case 'wander': {
      const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
      if (d < 6) { toIdle(p); break; }
      const sp = 34 + p.size * 12;
      steer(p, dx / d * sp, dy / d * sp, 4, dt);
      p.t -= dt; if (p.t <= 0) toIdle(p);
      break;
    }
    case 'flee':
      p.t -= dt; damp(p, 2.5, dt);
      if (p.t <= 0 || Math.hypot(p.vx, p.vy) < 8) toIdle(p, rnd(0.3, 1.5));
      break;
    case 'seek': {
      const o = p.obj;
      if (!o || o.gone || (o.type === 'treat' && o.eaten) || (o.type === 'ball' && (ball.state === 'carried' || !ball.active))) { toIdle(p, 0.5); break; }
      const dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy);
      const arrive = o.type === 'point' ? 26 : o.type === 'treat' ? 13 : 15;
      if (d < arrive) {
        if (o.type === 'treat') { o.eaten = true; p.state = 'eat'; p.t = 1.7; p.vx = p.vy = 0; if (dx < 0) p.facing = -1; else p.facing = 1; sfx.crunch(); }
        else if (o.type === 'ball') { if (ball.z < 25) pickUpBall(p); else damp(p, 6, dt); }
        else toIdle(p, rnd(0.4, 1));
        break;
      }
      const sp = o.type === 'ball' ? 200 : 150;
      steer(p, dx / d * sp, dy / d * sp, 6, dt);
      p.t -= dt; if (p.t <= 0) toIdle(p);
      break;
    }
    case 'eat':
      p.t -= dt;
      if (Math.random() < dt * 5) spawnCrumb(p);
      if (p.t <= 0) { removeTreat(p.obj); p.obj = null; p.state = 'happy'; p.t = 1.8; spawnHearts(p, 1); }
      break;
    case 'happy':
      p.t -= dt; damp(p, 6, dt);
      if (p.t <= 0) toIdle(p);
      break;
    case 'sleep':
      p.t -= dt;
      if (Math.random() < dt * 0.7) spawnZz(p);
      if (p.t <= 0) toIdle(p, 0.5);
      break;
    case 'carry': {
      const dx = ball.hx - p.x, dy = ball.hy - p.y, d = Math.hypot(dx, dy);
      p.t -= dt;
      if (d < 26 || p.t <= 0) { dropBall(p); break; }
      steer(p, dx / d * 140, dy / d * 140, 6, dt);
      break;
    }
    case 'form': {
      const dx = p.fx - p.x, dy = p.fy - p.y, d = Math.hypot(dx, dy);
      if (d < 1.5) { p.vx *= 0.5; p.vy *= 0.5; }
      else { const sp = Math.min(280, d * 3 + 15); steer(p, dx / d * sp, dy / d * sp, 5, dt); }
      break;
    }
  }
  const spd = Math.hypot(p.vx, p.vy);
  if (spd > 420) { p.vx *= 420 / spd; p.vy *= 420 / spd; }
  p.x += p.vx * dt; p.y += p.vy * dt;
  if (p.x < MARGIN) { p.x = MARGIN; p.vx = Math.abs(p.vx) * 0.5; }
  else if (p.x > WORLD.w - MARGIN) { p.x = WORLD.w - MARGIN; p.vx = -Math.abs(p.vx) * 0.5; }
  if (p.y < MARGIN) { p.y = MARGIN; p.vy = Math.abs(p.vy) * 0.5; }
  else if (p.y > WORLD.h - MARGIN) { p.y = WORLD.h - MARGIN; p.vy = -Math.abs(p.vy) * 0.5; }
  if (Math.abs(p.vx) > 4 && p.state !== 'eat') p.facing = p.vx > 0 ? 1 : -1;
  if (spd > 8) p.anim += dt * spd / 7;
  p.wag += dt * (p.state === 'happy' ? 16 : 5);
}
function poseOf(p) {
  if (p.state === 'sleep') return P_SLEEP;
  if (p.state === 'eat') return P_EAT;
  if (p.state === 'happy') return P_HAPPY;
  if (Math.hypot(p.vx, p.vy) > 8) return P_WALK1 + ((p.anim | 0) & 1);
  if (p.state === 'idle' && p.idlePose === 'sit') return P_SIT;
  if (p.state === 'form' && p.i % 3 === 0) return P_SIT;
  return P_STAND;
}

// ============================================================ ACTIONS
function shoo(x, y, r, pvx, pvy, dt) {
  eachNear(x, y, r, (p, d) => {
    if (p.state === 'carry' || p.state === 'eat') return;
    d = d || 0.01;
    const f = 1 - d / r;
    const dx = (p.x - x) / d, dy = (p.y - y) / d;
    p.vx += (dx * 1500 * f + pvx * 3 * f) * dt;
    p.vy += (dy * 1500 * f + pvy * 3 * f) * dt;
    if (p.state !== 'seek') { p.state = 'flee'; p.t = 0.7; p.obj = null; }
  });
}
function callPuppies(x, y, r) {
  callPoint.x = x; callPoint.y = y;
  eachNear(x, y, r, (p, d) => {
    if (d < 30) return;
    if (isFree(p) || (p.state === 'seek' && p.obj === callPoint)) { p.state = 'seek'; p.obj = callPoint; p.t = 8; }
  });
}
function puppyAt(x, y) {
  let best = null, bd = 1e9;
  eachNear(x, y, 40, (p) => {
    // hit box roughly matches the drawn body + head
    const dx = (x - p.x) / (22 * p.size), dy = (y - (p.y - 3 * p.size)) / (16 * p.size);
    const d = dx * dx + dy * dy;
    if (d < 1 && d < bd) { bd = d; best = p; }
  });
  return best;
}
function pet(p, first) {
  if (p.state === 'carry') { spawnHearts(p, 1); return; }
  if (!first && now - p.lastPet < 0.35) return;
  p.lastPet = now;
  p.state = 'happy'; p.t = 2.4; p.vx = p.vy = 0; p.obj = null;
  spawnHearts(p, first ? 3 : 1);
  if (!p.petted) {
    p.petted = true; pettedCount++; savePetted(); updateCounter(); checkMilestone();
  }
  if (first) { showCard(p, 3500); sfx.yip(); }
}
function dropTreat(x, y) {
  const t = { type: 'treat', x, y, eaten: false, gone: false };
  treats.push(t); if (treats.length > 30) removeTreat(treats[0]);
  stats.treats++; saveStats(); sfx.pop();
  const cands = [];
  eachNear(x, y, 340, (p, d) => { if (isFree(p) || p.state === 'form' || p.state === 'sleep') cands.push([d, p]); });
  cands.sort((a, b) => a[0] - b[0]);
  cands.slice(0, 5).forEach(([, p]) => { p.state = 'seek'; p.obj = t; p.t = 10; });
}
function removeTreat(t) { if (!t) return; t.gone = true; const i = treats.indexOf(t); if (i >= 0) treats.splice(i, 1); }
function throwBall(tx, ty) {
  if (ball.carrier) { const c = ball.carrier; ball.carrier = null; toIdle(c, 0.3); }
  const home = playerPos();
  ball.hx = clamp(home.x, MARGIN, WORLD.w - MARGIN); ball.hy = clamp(home.y, MARGIN, WORLD.h - MARGIN);
  if (!ball.active) { ball.x = ball.hx; ball.y = ball.hy; ball.active = true; }
  ball.type = 'ball';
  const d = dist(ball.x, ball.y, tx, ty), T = clamp(d / 520, 0.45, 1.7);
  ball.vx = (tx - ball.x) / T; ball.vy = (ty - ball.y) / T; ball.z = 0; ball.vz = G * T / 2;
  ball.state = 'fly'; stats.throws++; saveStats(); sfx.whoosh();
  const cands = [];
  eachNear(tx, ty, 480, (p, d) => { if (isFree(p) || p.state === 'form') cands.push([d, p]); });
  cands.sort((a, b) => a[0] - b[0]);
  cands.slice(0, 3).forEach(([, p]) => { p.state = 'seek'; p.obj = ball; p.t = 12; });
}
function pickUpBall(p) {
  ball.state = 'carried'; ball.carrier = p; ball.vx = ball.vy = ball.vz = 0;
  p.state = 'carry'; p.t = 20; p.obj = null; sfx.pop();
}
function dropBall(p) {
  ball.state = 'rest'; ball.carrier = null; ball.z = 0; ball.x = p.x + p.facing * 16; ball.y = p.y + 4;
  p.state = 'happy'; p.t = 2.2; stats.fetches++; saveStats();
  spawnHearts(p, 2); sfx.yip(); showCard(p, 3000, 'Good dog, ' + p.name + '! 🎾');
}
function updateBall(dt) {
  if (!ball.active) return;
  if (ball.state === 'fly') {
    ball.x += ball.vx * dt; ball.y += ball.vy * dt; ball.z += ball.vz * dt; ball.vz -= G * dt;
    if (ball.z <= 0) {
      ball.z = 0; ball.vz = -ball.vz * 0.45; ball.vx *= 0.55; ball.vy *= 0.55;
      if (ball.vz < 70) { ball.vz = 0; ball.vx = ball.vy = 0; ball.state = 'rest'; } else sfx.boing();
    }
    ball.x = clamp(ball.x, MARGIN, WORLD.w - MARGIN); ball.y = clamp(ball.y, MARGIN, WORLD.h - MARGIN);
  } else if (ball.state === 'carried' && ball.carrier) {
    const c = ball.carrier; ball.x = c.x + c.facing * 12 * c.size; ball.y = c.y - 1; ball.z = 5;
  }
}

// ============================================================ PARTICLES
function spawnHearts(p, n) {
  for (let i = 0; i < n; i++) parts.push({ kind: 'heart', x: p.x + rnd(-8, 8), y: p.y - 14 * p.size, vx: rnd(-12, 12), vy: rnd(-45, -28), life: 1.3, max: 1.3, c: ['#ff4d7d', '#ff8fb3', '#ff2e63'][i % 3] });
}
function spawnCrumb(p) { parts.push({ kind: 'crumb', x: p.x + p.facing * 18, y: p.y + 6, vx: rnd(-25, 25), vy: rnd(-40, -10), life: 0.6, max: 0.6, c: '#c8a06a' }); }
function spawnZz(p) { parts.push({ kind: 'zz', x: p.x + p.facing * 8, y: p.y - 14, vx: p.facing * 8, vy: -18, life: 2, max: 2, c: '#fff' }); }
function updateParts(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const q = parts[i]; q.life -= dt; if (q.life <= 0) { parts.splice(i, 1); continue; }
    if (q.kind === 'crumb') q.vy += 200 * dt;
    q.x += q.vx * dt; q.y += q.vy * dt;
  }
  for (let i = confetti.length - 1; i >= 0; i--) {
    const q = confetti[i]; q.life -= dt; if (q.life <= 0) { confetti.splice(i, 1); continue; }
    q.vy += 500 * dt; q.vx *= 0.99; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt;
  }
}
function burstConfetti(sx, sy, n, spread) {
  const cols = ['#ff6fa3', '#ffd54f', '#4fc3f7', '#81c784', '#ba68c8', '#ff8a65'];
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, s = rnd(spread * 0.3, spread);
    confetti.push({ x: sx, y: sy, vx: Math.cos(a) * s, vy: Math.sin(a) * s - spread * 0.5, rot: Math.random() * TAU, vr: rnd(-8, 8), w: rnd(6, 12), h: rnd(4, 8), life: rnd(1.8, 3), c: cols[(Math.random() * cols.length) | 0] });
  }
}
let fireworksUntil = 0;

// ============================================================ FORMATIONS
function shapePoints(kind) {
  const sc = 0.25, cw = Math.round(WORLD.w * sc), ch = Math.round(WORLD.h * sc);
  const c = document.createElement('canvas'); c.width = cw; c.height = ch;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, cw, ch); g.fillStyle = '#fff';
  if (kind === 'heart') {
    const k = 0.86 * ch / 29, cx = cw / 2, cy = ch / 2 - 2.5 * k;
    g.beginPath();
    for (let t = 0; t <= TAU + 0.01; t += 0.04) {
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      if (t === 0) g.moveTo(cx + x * k, cy + y * k); else g.lineTo(cx + x * k, cy + y * k);
    }
    g.closePath(); g.fill();
  } else {
    const lines = kind === 'name' && kidName ? [kidName.toUpperCase(), '2000'] : ['2000'];
    const fam = "700 100px Fredoka, 'Arial Black', Impact, sans-serif";
    g.font = fam;
    let maxW = 1; lines.forEach(l => { maxW = Math.max(maxW, g.measureText(l).width); });
    const fs = Math.min(0.94 * cw / maxW * 100, 0.86 * ch / lines.length / 1.05);
    g.font = fam.replace('100px', fs + 'px');
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const lh = fs * 1.05, y0 = ch / 2 - lh * (lines.length - 1) / 2;
    lines.forEach((l, i) => g.fillText(l, cw / 2, y0 + i * lh));
  }
  const img = g.getImageData(0, 0, cw, ch).data;
  const filled = (x, y) => { x |= 0; y |= 0; return x >= 0 && y >= 0 && x < cw && y < ch && img[(y * cw + x) * 4] > 128; };
  let cnt = 0; for (let i = 0; i < cw * ch; i++) if (img[i * 4] > 128) cnt++;
  let step = Math.sqrt(cnt / N) || 1, pts = [];
  for (let iter = 0; iter < 10; iter++) {
    pts = [];
    let row = 0;
    for (let y = step / 2; y < ch; y += step * 0.9, row++)
      for (let x = (row & 1 ? step : step / 2); x < cw; x += step) if (filled(x, y)) pts.push([x / sc, y / sc]);
    if (pts.length >= N && pts.length < N * 1.08) break;
    step *= Math.sqrt(pts.length / (N * 1.03)) || 1;
  }
  if (pts.length > N) { const keep = [], k = pts.length / N; for (let i = 0; i < N; i++) keep.push(pts[Math.floor(i * k)]); pts = keep; }
  while (pts.length < N) { const q = pts.length ? pts[(Math.random() * pts.length) | 0] : [WORLD.w / 2, WORLD.h / 2]; pts.push([q[0] + rnd(-8, 8), q[1] + rnd(-8, 8)]); }
  return pts;
}
function countPoints() {
  const pts = [], labels = [], sp = 28, bw = 9 * sp;
  const gapX = (WORLD.w - 5 * bw) / 6, gapY = (WORLD.h - 4 * bw) / 5;
  for (let b = 0; b < 20; b++) {
    const col = b % 5, row = (b / 5) | 0;
    const x0 = gapX + col * (bw + gapX), y0 = gapY + 24 + row * (bw + gapY);
    for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) pts.push([x0 + c * sp, y0 + r * sp]);
    labels.push({ x: x0 + bw / 2, y: y0 - 34, text: String((b + 1) * 100) });
  }
  return { pts, labels };
}
function startFormation(kind) {
  let pts, labels = [];
  if (kind === 'count') ({ pts, labels } = countPoints());
  else pts = shapePoints(kind);
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const order = puppies.slice().sort((a, b) => a.x - b.x);
  for (let i = 0; i < N; i++) { const p = order[i]; p.fx = clamp(pts[i][0], MARGIN, WORLD.w - MARGIN); p.fy = clamp(pts[i][1], MARGIN, WORLD.h - MARGIN); }
  formation = { kind, labels };
  for (const p of puppies) if (p.state !== 'carry' && p.state !== 'eat') { p.state = 'form'; p.obj = null; }
  $('btn-surprise').classList.add('on');
  camT.zoom = minZoom(); camT.x = WORLD.w / 2; camT.y = WORLD.h / 2; clampCam(camT);
  sfx.chime();
}
function endFormation() {
  if (!formation) return;
  formation = null;
  for (const p of puppies) if (p.state === 'form') toIdle(p, rnd(0, 2));
  $('btn-surprise').classList.remove('on');
}

// ============================================================ SOUND
const sfx = (() => {
  let ac = null, muted = store.get('muted', '0') === '1';
  function actx() {
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } }
    if (ac && ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(f0, f1, dur, type, vol, delay) {
    const a = actx(); if (!a || muted) return;
    const t = a.currentTime + (delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  return {
    unlock() { actx(); },
    yip() { const b = rnd(0.85, 1.2); tone(650 * b, 1400 * b, 0.07, 'triangle', 0.12); tone(1400 * b, 750 * b, 0.11, 'triangle', 0.1, 0.07); },
    pop() { tone(320, 130, 0.12, 'sine', 0.2); },
    boing() { tone(220, 520, 0.14, 'triangle', 0.1); },
    whoosh() { tone(160, 900, 0.25, 'sawtooth', 0.03); },
    crunch() { tone(140, 70, 0.08, 'square', 0.06); tone(140, 70, 0.08, 'square', 0.06, 0.13); },
    chime() { [523, 659, 784, 1047].forEach((f, i) => tone(f, f * 1.001, 0.4, 'sine', 0.12, i * 0.11)); },
    fanfare() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, f * 1.001, 0.3, 'triangle', 0.1, i * 0.14)); },
    get muted() { return muted; }, set muted(v) { muted = v; store.set('muted', v ? '1' : '0'); }
  };
})();

// ============================================================ INPUT
const pointers = new Map();
let gesture = null;
const mouse = { x: -1, y: -1, vx: 0, vy: 0, inside: false, t: 0 };
let pinch = null;
function pointerVel(pt, e) {
  const t = performance.now();
  const dtm = Math.max(1, t - pt.t);
  const vx = (e.clientX - pt.x) / dtm * 1000, vy = (e.clientY - pt.y) / dtm * 1000;
  pt.vx = lerp(pt.vx, vx, 0.5); pt.vy = lerp(pt.vy, vy, 0.5);
  pt.x = e.clientX; pt.y = e.clientY; pt.t = t;
}
canvas.addEventListener('pointerdown', e => {
  e.preventDefault();
  sfx.unlock(); closeMenu();
  try { canvas.setPointerCapture(e.pointerId); } catch (err) { }
  const pt = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, vx: 0, vy: 0, t: performance.now(), moved: false, type: e.pointerType };
  pointers.set(e.pointerId, pt);
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinch = { d: dist(a.x, a.y, b.x, b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    gesture = { type: 'pinch' };
    return;
  }
  if (pointers.size > 2) return;
  const w = toWorld(e.clientX, e.clientY);
  if (tool === 'hand') {
    if (isPetMode()) {
      const p = puppyAt(w.x, w.y);
      if (p) { gesture = { type: 'pet' }; pet(p, true); }
      else gesture = { type: 'pan' };
    } else gesture = { type: e.pointerType === 'mouse' ? 'pan' : 'shoo' };
  } else if (tool === 'call') gesture = { type: 'call' };
  else gesture = { type: 'tap' };
  updateCursor();
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') {
    if (!pointers.has(e.pointerId)) pointerVel(mouse, e);
    mouse.inside = true;
  }
  const pt = pointers.get(e.pointerId);
  if (!pt) { mouse.x = e.clientX; mouse.y = e.clientY; updateCursor(); return; }
  const px = pt.x, py = pt.y;
  pointerVel(pt, e);
  if (dist(pt.x, pt.y, pt.sx, pt.sy) > 10) pt.moved = true;
  if (!gesture) return;
  if (gesture.type === 'pinch' && pointers.size >= 2 && !intro) {
    const [a, b] = [...pointers.values()];
    const d = dist(a.x, a.y, b.x, b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    panBy(mx - pinch.mx, my - pinch.my);
    zoomAt(mx, my, camT.zoom * (d / Math.max(1, pinch.d)), true);
    pinch = { d, mx, my };
  } else if (gesture.type === 'tap' && pt.moved) { gesture = { type: 'pan' }; }
  if (gesture.type === 'pan' && !intro) panBy(e.clientX - px, e.clientY - py);
  else if (gesture.type === 'pet') { const w = toWorld(e.clientX, e.clientY); const p = puppyAt(w.x, w.y); if (p) pet(p, false); }
  updateCursor();
});
function endPointer(e) {
  const pt = pointers.get(e.pointerId);
  if (!pt) return;
  if (gesture && gesture.type === 'tap' && !pt.moved && pointers.size === 1) {
    const w = toWorld(e.clientX, e.clientY);
    const x = clamp(w.x, MARGIN, WORLD.w - MARGIN), y = clamp(w.y, MARGIN, WORLD.h - MARGIN);
    if (tool === 'treat') dropTreat(x, y);
    else if (tool === 'ball') throwBall(x, y);
  }
  pointers.delete(e.pointerId);
  if (pointers.size === 0) gesture = null;
  else if (pointers.size === 1 && gesture && gesture.type === 'pinch') { gesture = { type: 'idle' }; pinch = null; }
  updateCursor();
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') mouse.inside = false; });
canvas.addEventListener('wheel', e => {
  e.preventDefault(); if (intro) return;
  zoomAt(e.clientX, e.clientY, camT.zoom * Math.exp(-e.deltaY * 0.0016), false);
}, { passive: false });
canvas.addEventListener('dblclick', e => { if (!intro) zoomAt(e.clientX, e.clientY, camT.zoom * 2, false); });
canvas.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('gesturestart', e => e.preventDefault());
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  const step = 60;
  if (e.key === 'ArrowLeft' || e.key === 'a') panBy(step, 0);
  else if (e.key === 'ArrowRight' || e.key === 'd') panBy(-step, 0);
  else if (e.key === 'ArrowUp' || e.key === 'w') panBy(0, step);
  else if (e.key === 'ArrowDown' || e.key === 's') panBy(0, -step);
  else if (e.key === '+' || e.key === '=') zoomAt(W / 2, H / 2, camT.zoom * 1.4, false);
  else if (e.key === '-' || e.key === '_') zoomAt(W / 2, H / 2, camT.zoom / 1.4, false);
  else if (e.key === '1') setTool('hand'); else if (e.key === '2') setTool('call');
  else if (e.key === '3') setTool('treat'); else if (e.key === '4') setTool('ball');
  else if (e.key === 'Escape') { closeMenu(); $('help').classList.add('hidden'); }
});
function updateCursor() {
  let cls = '';
  if (gesture && gesture.type === 'pan') cls = 'grab';
  else if (tool === 'hand' && isPetMode() && mouse.inside) { const w = toWorld(mouse.x, mouse.y); if (puppyAt(w.x, w.y)) cls = 'point'; }
  else if (tool !== 'hand') cls = 'point';
  canvas.className = cls;
}
// minimap navigation
function miniNav(e) {
  const r = mini.getBoundingClientRect();
  camT.x = (e.clientX - r.left) / r.width * WORLD.w; camT.y = (e.clientY - r.top) / r.height * WORLD.h;
  clampCam(camT);
}
let miniDown = false;
mini.addEventListener('pointerdown', e => { if (intro) return; miniDown = true; mini.setPointerCapture(e.pointerId); miniNav(e); e.preventDefault(); });
mini.addEventListener('pointermove', e => { if (miniDown) miniNav(e); });
mini.addEventListener('pointerup', () => { miniDown = false; });
mini.addEventListener('pointercancel', () => { miniDown = false; });

// ============================================================ HUD
function setTool(t) {
  tool = t;
  document.querySelectorAll('#toolbar .tool').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  updateCursor();
}
document.querySelectorAll('#toolbar .tool').forEach(b => b.addEventListener('click', () => { sfx.unlock(); setTool(b.dataset.tool); closeMenu(); }));
$('btn-zoomin').addEventListener('click', () => { if (!intro) zoomAt(W / 2, H / 2, camT.zoom * 1.6, false); });
$('btn-zoomout').addEventListener('click', () => { if (!intro) zoomAt(W / 2, H / 2, camT.zoom / 1.6, false); });
$('btn-all').addEventListener('click', () => { if (intro) return; camT.zoom = minZoom(); camT.x = WORLD.w / 2; camT.y = WORLD.h / 2; clampCam(camT); });
$('btn-surprise').addEventListener('click', () => { sfx.unlock(); $('surprise-menu').classList.toggle('hidden'); });
function closeMenu() { $('surprise-menu').classList.add('hidden'); }
document.querySelectorAll('#surprise-menu button').forEach(b => b.addEventListener('click', () => {
  closeMenu(); if (intro) return;
  if (b.dataset.form === 'free') endFormation(); else startFormation(b.dataset.form);
}));
$('btn-sound').addEventListener('click', () => { sfx.muted = !sfx.muted; updateSoundIcon(); if (!sfx.muted) { sfx.unlock(); sfx.pop(); } });
function updateSoundIcon() { $('sound-icon').textContent = sfx.muted ? '🔇' : '🔊'; }
$('btn-help').addEventListener('click', () => {
  closeMenu();
  $('help-stats').textContent = 'Treats given: ' + stats.treats + ' · Balls thrown: ' + stats.throws + ' · Fetches: ' + stats.fetches;
  $('help').classList.remove('hidden');
});
$('btn-close-help').addEventListener('click', () => $('help').classList.add('hidden'));
$('btn-replay').addEventListener('click', () => { $('help').classList.add('hidden'); endFormation(); startIntro(); });
$('btn-reset').addEventListener('click', () => {
  if (!confirm('Reset all petting progress? (Name and birthday are kept.)')) return;
  for (const p of puppies) p.petted = false;
  pettedCount = 0; stats = { treats: 0, throws: 0, fetches: 0 }; store.del('petted'); saveStats(); updateCounter();
  $('help').classList.add('hidden');
});
function updateCounter() {
  $('petcount').textContent = fmtNum(pettedCount);
  $('barfill').style.width = (pettedCount / N * 100) + '%';
}
let cardTimer = 0;
function showCard(p, ms, override) {
  const n = p.i + 1;
  const dayLine = n === 1 ? 'for <b>day 1</b> — the day you were born!' : 'for <b>day ' + fmtNum(n) + '</b> of your life';
  $('card').innerHTML = (override ? '<div class="name">' + override + '</div>' : '<div class="name">' + p.name + '</div>') +
    '<div class="day">Puppy <b>#' + fmtNum(n) + '</b>, ' + dayLine + '<br>' + fmtDate(dayDate(n)) + (p.petted ? ' · 💗 petted' : '') + '</div>';
  $('card').classList.remove('hidden');
  clearTimeout(cardTimer);
  if (ms) cardTimer = setTimeout(() => $('card').classList.add('hidden'), ms);
}
let toastTimer = 0;
function showToast(msg, ms) {
  $('toast').innerHTML = msg; $('toast').classList.remove('hidden');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.add('hidden'), ms || 3000);
}
const MILESTONES = { 10: 'Ten puppies petted! 🎉', 25: '25 puppies! Keep going!', 50: 'FIFTY puppies petted! 🐾', 100: 'ONE HUNDRED puppies! 🎉🎉',
  200: '200 puppies! Wow!', 300: '300! You are a puppy expert!', 400: '400 puppies petted!', 500: 'FIVE HUNDRED! That is a lot of puppies! 🎈',
  750: '750! Three quarters of the way to 1,000!', 1000: 'ONE THOUSAND PUPPIES! 🎆 Halfway there!', 1250: '1,250 puppies petted!',
  1500: '1,500! Only 500 puppies are still waiting!', 1750: '1,750! Almost every puppy!', 2000: 'ALL 2,000 PUPPIES! 🎆🎉 Every single one loves you!' };
function checkMilestone() {
  const m = MILESTONES[pettedCount]; if (!m) return;
  showToast(m, pettedCount >= 1000 ? 6000 : 3500);
  burstConfetti(W / 2, H * 0.4, 120, 500);
  if (pettedCount === 2000) { sfx.fanfare(); fireworksUntil = now + 12; setTimeout(() => startFormation('heart'), 800); }
  else sfx.chime();
}

// ============================================================ INTRO
function refreshIntroText() {
  const day2000 = dayDate(2000), a = ageParts(birthday, day2000);
  const parts = [];
  if (a.y) parts.push(a.y + (a.y === 1 ? ' year' : ' years'));
  if (a.m) parts.push(a.m + (a.m === 1 ? ' month' : ' months'));
  parts.push(a.d + (a.d === 1 ? ' day' : ' days'));
  const age = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0];
  $('intro-days').textContent = 'Day 2,000 is ' + fmtDate(day2000) + '. That is ' + age + '!';
  $('title').textContent = '🐶 2000 Puppies' + (kidName ? ' for ' + kidName : '');
  $('form-name').textContent = kidName ? '✨ Spell "' + kidName + '"' : '✨ Make a big 2000';
  document.title = kidName ? '2000 Puppies for ' + kidName + '!' : '2000 Puppies!';
}
$('name-input').value = kidName;
$('bday-input').value = ymd(birthday);
$('name-input').addEventListener('input', () => { kidName = $('name-input').value.trim(); store.set('name', kidName); refreshIntroText(); });
$('bday-input').addEventListener('change', () => { const d = parseDate($('bday-input').value); if (d) { birthday = d; store.set('bday', ymd(d)); refreshIntroText(); } });
$('btn-start').addEventListener('click', () => {
  sfx.unlock();
  kidName = $('name-input').value.trim(); store.set('name', kidName); refreshIntroText();
  $('intro').classList.add('hidden');
  startIntro();
});
function startIntro() {
  endFormation();
  const p = puppies[0];
  p.x = clamp(p.x, 300, WORLD.w - 300); p.y = clamp(p.y, 300, WORLD.h - 300);
  p.state = 'happy'; p.t = 3;
  cam.x = camT.x = p.x; cam.y = camT.y = p.y - 6; cam.zoom = camT.zoom = 5;
  intro = { t: 0, sx: cam.x, sy: cam.y, done: false };
  showCard(p, 0);
  $('bignum-n').textContent = '1'; $('bignum-label').textContent = 'puppy';
  $('bignum').classList.remove('hidden');
}
function updateIntro(dt) {
  intro.t += dt;
  const p = puppies[0];
  if (intro.t < 2.6) { cam.x = camT.x = p.x; cam.y = camT.y = p.y - 6; if (p.state !== 'happy') { p.state = 'happy'; p.t = 1; } return; }
  const prog = clamp((intro.t - 2.6) / 9, 0, 1), e = easeInOut(prog);
  cam.zoom = Math.exp(lerp(Math.log(5), Math.log(minZoom()), e));
  cam.x = lerp(intro.sx, WORLD.w / 2, e); cam.y = lerp(intro.sy, WORLD.h / 2, e);
  clampCam(cam); Object.assign(camT, cam);
  const n = prog >= 1 ? N : Math.max(1, visibleCount);
  $('bignum-n').textContent = fmtNum(n); $('bignum-label').textContent = n === 1 ? 'puppy' : 'puppies';
  if (prog > 0.05) $('card').classList.add('hidden');
  if (prog >= 1) {
    intro = null;
    $('bignum-label').textContent = 'puppies. One for every day' + (kidName ? ', ' + kidName : '') + '!';
    setTimeout(() => $('bignum').classList.add('hidden'), 4000);
    burstConfetti(W / 2, H * 0.3, 150, 550); sfx.fanfare();
  }
}

// ============================================================ RENDER
let grass = null;
function makeGrass() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); const r = mulberry32(5);
  g.fillStyle = '#7ccd6a'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = r() < 0.5 ? '#8fd97c' : '#6bbf5a'; g.lineWidth = 1.5;
    const x = r() * 128, y = r() * 128;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + r() * 4 - 2, y - 4 - r() * 4); g.stroke();
  }
  grass = ctx.createPattern(c, 'repeat');
}
const visible = [];
function render() {
  const z = cam.zoom;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#5aa64c'; ctx.fillRect(0, 0, W, H);
  // world space
  const ox = W / 2 - cam.x * z, oy = H / 2 - cam.y * z;
  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * ox, dpr * oy);
  ctx.fillStyle = grass; ctx.fillRect(0, 0, WORLD.w, WORLD.h);
  const vx0 = cam.x - W / 2 / z - 40, vx1 = cam.x + W / 2 / z + 40, vy0 = cam.y - H / 2 / z - 40, vy1 = cam.y + H / 2 / z + 40;
  if (z > 0.45) for (const f of flowers) {
    if (f.x < vx0 || f.x > vx1 || f.y < vy0 || f.y > vy1) continue;
    ctx.fillStyle = f.c;
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; ctx.beginPath(); ctx.arc(f.x + Math.cos(a) * f.s * 0.8, f.y + Math.sin(a) * f.s * 0.8, f.s * 0.55, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#ffca28'; ctx.beginPath(); ctx.arc(f.x, f.y, f.s * 0.45, 0, TAU); ctx.fill();
  }
  // fence
  ctx.strokeStyle = '#8d5a2b'; ctx.lineWidth = 8; ctx.strokeRect(0, 0, WORLD.w, WORLD.h);
  ctx.strokeStyle = '#c98b4b'; ctx.lineWidth = 3; ctx.strokeRect(0, 0, WORLD.w, WORLD.h);
  if (z > 0.5) {
    ctx.fillStyle = '#a86b36';
    for (let x = 0; x <= WORLD.w; x += 100) { if (x < vx0 - 10 || x > vx1 + 10) continue; ctx.fillRect(x - 5, -12, 10, 20); ctx.fillRect(x - 5, WORLD.h - 8, 10, 20); }
    for (let y = 0; y <= WORLD.h; y += 100) { if (y < vy0 - 10 || y > vy1 + 10) continue; ctx.fillRect(-12, y - 5, 20, 10); ctx.fillRect(WORLD.w - 8, y - 5, 20, 10); }
  }
  // formation labels
  if (formation && formation.labels.length) {
    ctx.font = '700 60px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 8; ctx.strokeStyle = 'rgba(60,30,10,0.75)'; ctx.fillStyle = '#fff';
    for (const l of formation.labels) { ctx.strokeText(l.text, l.x, l.y); ctx.fillText(l.text, l.x, l.y); }
  }
  // treats
  for (const t of treats) {
    if (t.x < vx0 || t.x > vx1 || t.y < vy0 || t.y > vy1) continue;
    ctx.fillStyle = '#fff3d6'; ctx.strokeStyle = '#c9a26e'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.rect(t.x - 6, t.y - 2.2, 12, 4.4); ctx.fill(); ctx.stroke();
    for (const s of [-1, 1]) { ctx.beginPath(); ctx.arc(t.x + s * 6, t.y - 2.3, 2.6, 0, TAU); ctx.arc(t.x + s * 6, t.y + 2.3, 2.6, 0, TAU); ctx.fill(); ctx.stroke(); }
  }
  // ball shadow
  if (ball.active) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(ball.x, ball.y + 4, 7 * (1 - ball.z / 600), 3.5 * (1 - ball.z / 600), 0, 0, TAU); ctx.fill(); }

  // collect visible puppies
  visible.length = 0;
  for (let i = 0; i < N; i++) { const p = puppies[i]; if (p.x >= vx0 && p.x <= vx1 && p.y >= vy0 && p.y <= vy1) visible.push(p); }
  visibleCount = visible.length;
  visible.sort((a, b) => a.y - b.y);
  const useVector = z >= 2.2 && visible.length <= 260;
  const dots = z * 24 < 3.5;
  // shadows
  if (!dots && z * 24 > 9) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    for (const p of visible) { const s = p.size; ctx.moveTo(p.x + 11 * s, p.y + 12 * s); ctx.ellipse(p.x, p.y + 12 * s, 11 * s, 4 * s, 0, 0, TAU); }
    ctx.fill();
  }
  const pw = mouse.inside ? toWorld(mouse.x, mouse.y) : null;
  if (dots) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = Math.max(1, z * 12);
    for (const p of visible) {
      ctx.fillStyle = p.petted ? mix(LOOKS[p.look].dot, '#ff6fa3', 0.5) : LOOKS[p.look].dot;
      ctx.fillRect(ox + p.x * z - r, oy + p.y * z - r, r * 2, r * 2);
    }
  } else if (!useVector) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const p of visible) {
      const s = z * p.size, k = s / SPR_SCALE;
      const sx = ox + p.x * z, sy = oy + p.y * z;
      const pose = poseOf(p);
      ctx.drawImage(sprites[p.look][pose][p.facing < 0 ? 1 : 0], sx - SPR_OX * k, sy - SPR_OY * k, SPR * k, SPR * k);
      if (p.petted && s > 0.5) {
        const c = GEOM[POSES[pose]].collar;
        ctx.fillStyle = p.collar; ctx.beginPath(); ctx.ellipse(sx + c[0] * s * p.facing, sy + c[1] * s, 2.2 * s, 6.5 * s, -0.35 * p.facing, 0, TAU); ctx.fill();
      }
    }
  } else {
    for (const p of visible) {
      const s = z * p.size;
      ctx.setTransform(dpr * s * p.facing, 0, 0, dpr * s, dpr * (ox + p.x * z), dpr * (oy + p.y * z));
      const pose = POSES[poseOf(p)];
      const o = { collar: p.petted ? p.collar : null, wag: Math.sin(p.wag) * (p.state === 'happy' ? 0.5 : 0.18) };
      if (pw && GEOM[pose].eyes === 'open') {
        const dx = pw.x - p.x, dy = pw.y - p.y, d = Math.hypot(dx, dy);
        if (d < 300 && d > 1) { const f = Math.min(1, 40 / d) * 0.9; o.ex = dx / d * f * p.facing; o.ey = dy / d * f; }
      }
      drawPuppy(ctx, LOOKS[p.look], pose, o);
    }
  }
  // ball
  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * ox, dpr * oy);
  if (ball.active) {
    const by = ball.y - ball.z;
    ctx.fillStyle = '#c6e64a'; ctx.beginPath(); ctx.arc(ball.x, by, 7, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(ball.x - 5, by, 7, -0.9, 0.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(ball.x + 5, by, 7, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
  }
  // world particles
  for (const q of parts) {
    const a = Math.min(1, q.life / q.max * 1.5);
    if (q.kind === 'heart') {
      const s = Math.max(5, 9 / z);
      ctx.fillStyle = q.c; ctx.globalAlpha = a;
      ctx.beginPath(); ctx.moveTo(q.x, q.y + s * 0.6);
      ctx.bezierCurveTo(q.x - s, q.y - s * 0.3, q.x - s * 0.5, q.y - s, q.x, q.y - s * 0.4);
      ctx.bezierCurveTo(q.x + s * 0.5, q.y - s, q.x + s, q.y - s * 0.3, q.x, q.y + s * 0.6); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (q.kind === 'crumb') { ctx.fillStyle = q.c; ctx.fillRect(q.x - 1.2, q.y - 1.2, 2.4, 2.4); }
    else if (q.kind === 'zz') {
      ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.8;
      ctx.font = '700 ' + Math.max(8, 12 / z) + 'px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.strokeText('z', q.x, q.y); ctx.fillText('z', q.x, q.y); ctx.globalAlpha = 1;
    }
  }
  // screen space
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!intro && ((tool === 'hand' && !isPetMode() && mouse.inside && !(gesture && gesture.type === 'pan')) || (tool === 'call'))) {
    const active = tool === 'call' ? (gesture && gesture.type === 'call') : true;
    const px = gesture && pointers.size ? [...pointers.values()][0].x : mouse.x, py = gesture && pointers.size ? [...pointers.values()][0].y : mouse.y;
    if (mouse.inside || (gesture && pointers.size)) {
      ctx.beginPath(); ctx.arc(px, py, tool === 'call' ? CALL_PX : SHOO_PX, 0, TAU);
      ctx.fillStyle = active ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.04)'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  for (const q of confetti) {
    ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.fillStyle = q.c; ctx.globalAlpha = Math.min(1, q.life);
    ctx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h); ctx.restore();
  }
  ctx.globalAlpha = 1;
}
let miniFrame = 0;
function renderMini() {
  if ((miniFrame++ & 3) !== 0) return;
  const mw = mini.width, mh = mini.height, kx = mw / WORLD.w, ky = mh / WORLD.h;
  mctx.fillStyle = '#6dbf5c'; mctx.fillRect(0, 0, mw, mh);
  for (let i = 0; i < N; i++) { const p = puppies[i]; mctx.fillStyle = p.petted ? '#ff6fa3' : '#5b3a1e'; mctx.fillRect(p.x * kx - 0.75, p.y * ky - 0.75, 1.5, 1.5); }
  const vw = W / cam.zoom * kx, vh = H / cam.zoom * ky;
  mctx.strokeStyle = '#fff'; mctx.lineWidth = 2;
  mctx.strokeRect(cam.x * kx - vw / 2, cam.y * ky - vh / 2, vw, vh);
}

// ============================================================ MAIN LOOP
let last = performance.now();
function frame(t) {
  requestAnimationFrame(frame);
  let dt = (t - last) / 1000; last = t;
  if (dt > 0.1) dt = 0.1; if (dt <= 0) return;
  now += dt;
  // camera easing
  if (!intro) {
    const k = 1 - Math.exp(-dt * 10);
    cam.zoom = Math.exp(lerp(Math.log(cam.zoom), Math.log(camT.zoom), k));
    cam.x = lerp(cam.x, camT.x, k); cam.y = lerp(cam.y, camT.y, k);
    clampCam(cam);
  } else updateIntro(dt);
  // input-driven forces
  const shooActive = tool === 'hand' && !isPetMode() && ((gesture && gesture.type === 'shoo') || (!gesture && mouse.inside));
  if (shooActive) {
    let sx, sy, vx, vy;
    if (gesture && gesture.type === 'shoo') { const pt = [...pointers.values()][0]; sx = pt.x; sy = pt.y; vx = pt.vx; vy = pt.vy; }
    else { sx = mouse.x; sy = mouse.y; vx = mouse.vx; vy = mouse.vy; }
    const w = toWorld(sx, sy);
    shoo(w.x, w.y, SHOO_PX / cam.zoom, vx / cam.zoom, vy / cam.zoom, dt);
  }
  mouse.vx *= 0.85; mouse.vy *= 0.85;
  if (gesture && gesture.type === 'call' && pointers.size) { const pt = [...pointers.values()][0]; const w = toWorld(pt.x, pt.y); callPuppies(w.x, w.y, CALL_PX / cam.zoom); }
  // simulate
  for (let i = 0; i < N; i++) updatePuppy(puppies[i], dt);
  rebuildGrid();
  separate();
  updateBall(dt);
  updateParts(dt);
  if (now < fireworksUntil && Math.random() < dt * 2.5) burstConfetti(rnd(W * 0.15, W * 0.85), rnd(H * 0.15, H * 0.5), 60, 400);
  render();
  renderMini();
}

// ============================================================ BOOT
resize();
makeGrass();
makeSprites();
makePuppies();
pettedCount = puppies.reduce((a, p) => a + (p.petted ? 1 : 0), 0);
updateCounter();
updateSoundIcon();
refreshIntroText();
camT.zoom = cam.zoom = minZoom(); clampCam(cam); clampCam(camT);
if (params.get('intro') === '0') {
  // skip the title screen (also used for testing): ?intro=0&zoom=3&x=1500&y=1000
  $('intro').classList.add('hidden');
  if (params.get('zoom')) camT.zoom = +params.get('zoom');
  if (params.get('x')) camT.x = +params.get('x');
  if (params.get('y')) camT.y = +params.get('y');
  clampCam(camT); Object.assign(cam, camT);
}
requestAnimationFrame(frame);
// small debug handle (used by the headless tests)
window.TKP = { puppies, cam, camT, startFormation, endFormation, dropTreat, throwBall, get stats() { return stats; }, get petted() { return pettedCount; }, get ball() { return ball; }, get formation() { return formation; } };
})();
