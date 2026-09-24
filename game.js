'use strict';
(function () {
// ============================================================ CONFIG
let N = 2000;                 // number of days = number of puppies; set from ?days= in SETTINGS below
const MAX_DAYS = 2600;        // about 7 years; the field is sized for this many
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
// How many days (one puppy each) to celebrate:
//   ?birthday=YYYY-MM-DD  counts the days from that birthday to today (day 1 is the birthday), so the link stays right every day
//   ?days=1846            a fixed number; ignored when the link also has a birthday
//   neither               2,000 (or the number saved from the title screen)
const urlBirthday = parseDate(params.get('birthday'));
const requestedDays = urlBirthday
  ? Math.round((todayUTC().getTime() - urlBirthday.getTime()) / DAY_MS) + 1
  : parseInt(params.get('days') || store.get('days', '2000'), 10) || 2000;
N = clamp(requestedDays, 10, MAX_DAYS);
const tooMany = requestedDays > MAX_DAYS ? requestedDays : 0;   // someone older than our field can hold: draw the max, and say so
// Progress (collars, stats) is saved under a key that stays the same for the same kid: the birthday when the link
// has one (the count grows by one every day, so keying on N would reset the collars overnight), else the count.
// Two kids' links still don't mix on one device.
const KEY = urlBirthday ? '.' + ymd(urlBirthday) : (N === 2000 ? '' : '.' + N);
let kidName = (params.get('name') || store.get('name', '')).trim();
let birthday = urlBirthday || parseDate(store.get('bday', '')) || new Date(todayUTC().getTime() - (N - 1) * DAY_MS);
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

// ears: 'floppy' | 'pointy'; shaggy: fluffy outline; tail: 'wag' | 'curl'; sz: breed size multiplier
const LOOKS = [
  { fur: '#e8b86d', dark: '#c9954a', light: '#f7e1b5', sz: 1.1 },                                              // golden
  { fur: '#f3e3c3', dark: '#d9c39a', light: '#fff7e6' },                                                       // cream
  { fur: '#7a4a2a', dark: '#5a3419', light: '#b98a62', sz: 1.15 },                                             // chocolate lab
  { fur: '#3a3a3a', dark: '#1f1f1f', light: '#8a7a70', sz: 1.1 },                                              // black lab
  { fur: '#fafafa', dark: '#d8d8d8', light: '#ffffff' },                                                       // white
  { fur: '#9a9a9a', dark: '#6e6e6e', light: '#dcdcdc' },                                                       // grey
  { fur: '#d99a5b', dark: '#3b2a20', light: '#fff2dc', pattern: 'patch', sz: 0.9 },                            // beagle
  { fur: '#fafafa', dark: '#333333', light: '#ffffff', pattern: 'spots', spot: '#222222', sz: 1.1 },           // dalmatian
  { fur: '#e0893a', dark: '#c0702a', light: '#fff8ee', pattern: 'belly', ears: 'pointy', sz: 0.85 },           // corgi
  { fur: '#b9bcc4', dark: '#5b5f6b', light: '#ffffff', pattern: 'mask', ears: 'pointy', tail: 'curl', sz: 1.15 }, // husky
  { fur: '#c96b3f', dark: '#a0522d', light: '#f3d3b8', shaggy: true, sz: 1.1 },                                // red setter
  { fur: '#f0d9b5', dark: '#e2b07a', light: '#ffffff', pattern: 'spots', spot: '#b5793f' },                    // spotted tan
  { fur: '#c8935a', dark: '#1c1c1c', light: '#e9c99a', pattern: 'saddle', muzzle: true, ears: 'pointy', sz: 1.3 },   // german shepherd: black saddle and muzzle
  { fur: '#f7f4ec', dark: '#dcd6c8', light: '#ffffff', shaggy: true, ears: 'pointy', sz: 0.75 },               // westie
  { fur: '#c9ccd2', dark: '#8b8f98', light: '#ffffff', pattern: 'belly', shaggy: true, sz: 1.3 },              // sheepdog
  { fur: '#f2c69b', dark: '#d9a677', light: '#fff4e6', shaggy: true, sz: 0.8 },                                // apricot poodle
  { fur: '#2b2b2b', dark: '#111111', light: '#6f6660', shaggy: true, ears: 'pointy', sz: 0.75 },               // scottie
  { fur: '#e6923c', dark: '#c77a2c', light: '#fff5e0', pattern: 'belly', ears: 'pointy', tail: 'curl', sz: 0.9 }, // shiba
  { fur: '#f5c27a', dark: '#e0a75c', light: '#fff8ea', shaggy: true, ears: 'pointy', tail: 'curl', sz: 0.65 }, // pomeranian
  { fur: '#c8a06a', dark: '#5c5a62', light: '#e8d3b0', pattern: 'saddle', shaggy: true, ears: 'pointy', sz: 0.7 }, // yorkie
  { fur: '#efe6d6', dark: '#7a5a3a', light: '#ffffff', pattern: 'patch', shaggy: true, sz: 1.2 },              // st bernard-ish
  { fur: '#5a4632', dark: '#3b2a1e', light: '#a88a6a', ears: 'pointy', sz: 1.0 },                              // brown mutt
  // stripes and spots
  { fur: '#a1785a', dark: '#3e2723', light: '#e8d5c4', pattern: 'stripes', sz: 1.05 },                         // brindle boxer
  { fur: '#d4a373', dark: '#4e342e', light: '#f5e6d3', pattern: 'stripes', ears: 'pointy', sz: 0.95 },         // brindle mutt
  { fur: '#b0bec5', dark: '#37474f', light: '#eceff1', pattern: 'bigspots', spot: '#37474f', sz: 1.0 },        // blue merle
  { fur: '#fff8e1', dark: '#8d6e63', light: '#ffffff', pattern: 'bigspots', spot: '#a1887f', sz: 0.95 },       // brown-and-white spotted
  { fur: '#fafafa', dark: '#3e2723', light: '#ffffff', pattern: 'patches', spot: '#5d4037', sz: 1.05 },        // pointer
  // great danes: huge and lean
  { fur: '#fafafa', dark: '#212121', light: '#ffffff', pattern: 'patches', spot: '#212121', slim: true, sz: 1.6 },   // harlequin
  { fur: '#d2a679', dark: '#3e2723', light: '#f3e0c8', pattern: 'mask', ears: 'pointy', slim: true, sz: 1.6 },       // fawn
  { fur: '#546e7a', dark: '#37474f', light: '#b0bec5', slim: true, sz: 1.6 },                                        // blue
  // french poodles: pom-poms everywhere
  { fur: '#ffffff', dark: '#e6e6e6', light: '#ffffff', poodle: true, sz: 0.95 },                              // white
  { fur: '#2a2a2a', dark: '#111111', light: '#666666', poodle: true, sz: 0.95 },                              // black
  { fur: '#f4c7a1', dark: '#e0a878', light: '#fff2e6', poodle: true, sz: 0.7 },                               // toy apricot
  // pugs: flat dark muzzle, curly tail
  { fur: '#e8c39e', dark: '#2b2b2b', light: '#e8c39e', pug: true, tail: 'curl', sz: 0.8 },                    // fawn
  { fur: '#2b2b2b', dark: '#111111', light: '#2b2b2b', pug: true, tail: 'curl', sz: 0.8 },                    // black
  // wiener dogs
  { fur: '#c1633a', dark: '#8d4526', light: '#e8a97e', long: true, sz: 0.85, w: 0.4 },                                // red dachshund
  { fur: '#2b2b2b', dark: '#111111', light: '#c98a4b', long: true, pattern: 'belly', sz: 0.85, w: 0.4 },              // black-and-tan dachshund
  { fur: '#7a4a2a', dark: '#4e2f1b', light: '#b98a62', long: true, pattern: 'bigspots', spot: '#c9a58a', sz: 0.85, w: 0.4 }, // chocolate dapple
  { fur: '#d9b28c', dark: '#a8825e', light: '#f3e2cd', long: true, shaggy: true, sz: 0.85, w: 0.4 },                  // wire-haired dachshund
  // chihuahuas: tiny, enormous ears, big eyes
  { fur: '#d9a874', dark: '#b8864f', light: '#f6e3c6', ears: 'pointy', earSize: 1.6, bigEyes: true, sz: 0.55 },        // fawn
  { fur: '#2b2b2b', dark: '#111111', light: '#c98a4b', pattern: 'belly', ears: 'pointy', earSize: 1.6, bigEyes: true, sz: 0.55 }, // black-and-tan
  { fur: '#fbf7f0', dark: '#e6dccc', light: '#ffffff', ears: 'pointy', earSize: 1.6, bigEyes: true, sz: 0.55 },        // white
  // more fun ones
  { fur: '#1e1e1e', dark: '#0d0d0d', light: '#c47a3a', pattern: 'tri', sz: 1.35 },                                     // bernese mountain dog
  { fur: '#1e1e1e', dark: '#0d0d0d', light: '#ffffff', pattern: 'blaze', ears: 'pointy', sz: 1.0 },                    // border collie
  { fur: '#1e1e1e', dark: '#0d0d0d', light: '#ffffff', pattern: 'blaze', pug: true, ears: 'pointy', sz: 0.8 },         // boston terrier
  { fur: '#fafafa', dark: '#6d4c2a', light: '#ffffff', pattern: 'patches', spot: '#8d5a2b', long: true, earSize: 1.7, sz: 0.95, w: 0.5 }, // basset hound
  { fur: '#ffffff', dark: '#ededed', light: '#ffffff', shaggy: true, ears: 'pointy', tail: 'curl', sz: 1.15 },         // samoyed
  { fur: '#b0bec5', dark: '#78909c', light: '#eceff1', slim: true, ears: 'pointy', earSize: 0.7, sz: 1.35 },           // greyhound
  { fur: '#c62828', dark: '#8e0000', light: '#ffcdd2', ears: 'pointy', tail: 'curl', shaggy: true, sz: 1.0, w: 0.3 }   // a rare red one, because why not
];
LOOKS.forEach(L => { L.mid = mix(L.fur, L.dark, 0.5); L.dot = L.spot ? mix(L.fur, L.spot, 0.3) : L.fur; L.dotPetted = mix(L.dot, '#ff6fa3', 0.5); L.sz = L.sz || 1; L.ears = L.ears || 'floppy'; L.tail = L.tail || 'wag'; L.w = L.w || 1; });
// weighted pick: a look with w: 0.4 turns up 40% as often as a normal one
const LOOK_TOTAL_W = LOOKS.reduce((a, L) => a + L.w, 0);
function pickLook(u) { let x = u * LOOK_TOTAL_W; for (let i = 0; i < LOOKS.length; i++) { x -= LOOKS[i].w; if (x < 0) return i; } return LOOKS.length - 1; }
const COLLARS = ['#e53935', '#1e88e5', '#43a047', '#fb8c00', '#8e24aa', '#00acc1', '#ff6fa3', '#fdd835'];

// ============================================================ PUPPY DRAWING
// Local units: body center at origin, ground at y = 13, faces +x.
const POSES = ['stand', 'walk1', 'walk2', 'sit', 'happy', 'sleep', 'eat', 'beg', 'lie'];
const P_STAND = 0, P_WALK1 = 1, P_WALK2 = 2, P_SIT = 3, P_HAPPY = 4, P_SLEEP = 5, P_EAT = 6, P_BEG = 7, P_LIE = 8;
const GEOM = {
  stand: { body: [-3, 0, 13, 9], head: [10, -7, 9.5], legs: [[-10, 5, 8], [-4, 5, 8], [3, 5, 8], [8, 5, 8]], tail: [-14, -3, 0.9], eyes: 'open', collar: [4.5, -1] },
  walk1: { body: [-3, -1, 13, 9], head: [10, -8, 9.5], legs: [[-11, 4, 9], [-3, 4, 7], [2, 4, 7], [9, 4, 9]], tail: [-14, -4, 0.7], eyes: 'open', collar: [4.5, -2] },
  walk2: { body: [-3, -1, 13, 9], head: [10, -8, 9.5], legs: [[-9, 4, 7], [-5, 4, 9], [4, 4, 9], [7, 4, 7]], tail: [-14, -4, 1.1], eyes: 'open', collar: [4.5, -2] },
  sit: { body: [-3, 2, 10, 10.5], haunch: [-8, 6, 6.5], head: [9, -9, 9.5], legs: [[2, 3, 10], [7, 3, 10]], tail: [-12, 9, 0.15], eyes: 'open', collar: [3.5, -1.5] },
  happy: { body: [-3, 2, 10, 10.5], haunch: [-8, 6, 6.5], head: [9, -9, 9.5], legs: [[2, 3, 10], [7, 3, 10]], tail: [-12, 9, 0.3], eyes: 'happy', blush: true, tongue: true, collar: [3.5, -1.5] },
  sleep: { body: [-2, 5, 14, 7], head: [11, 1, 9], legs: [[-10, 9, 4], [6, 9, 4]], tail: [-15, 7, -0.2], eyes: 'closed', collar: [5, 2] },
  eat: { body: [-3, 0, 13, 9], head: [12, -2, 9.5], legs: [[-10, 5, 8], [-4, 5, 8], [3, 5, 8], [8, 5, 8]], tail: [-14, -3, 0.6], eyes: 'open', collar: [5, 0] },
  // begging: sitting up tall, front paws tucked up in front of the chest
  beg: { body: [-2, 3, 8.5, 11], haunch: [-7, 8, 5.5], head: [6, -12, 9.5], legs: [[2, -2, 6], [7, -2, 6]], tail: [-9, 11, 0.4], eyes: 'open', tongue: true, collar: [2.5, -3] },
  // lying down, awake
  lie: { body: [-2, 5, 14, 7], head: [11, 1, 9], legs: [[-10, 9, 4], [6, 9, 4]], tail: [-15, 7, -0.2], eyes: 'open', collar: [5, 2] }
};
function ell(g, x, y, rx, ry, rot, color) { g.fillStyle = color; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, TAU); g.fill(); }
function circ(g, x, y, r, color) { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
function leg(g, x, top, len, color) {
  g.strokeStyle = color; g.lineWidth = 5.5; g.lineCap = 'round';
  // starts a little above 'top', tucked inside the body, so legs near the thin ends of a body ellipse still meet it
  g.beginPath(); g.moveTo(x, top - 1); g.lineTo(x, top + len - 2.7); g.stroke();
}
// an ellipse with a scalloped edge: shaggy fur
function fluff(g, x, y, rx, ry, color, n) {
  g.fillStyle = color; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, TAU);
  const rr = Math.min(rx, ry) * 0.24;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + (i % 2) * 0.1, px = x + Math.cos(a) * rx * 0.96, py = y + Math.sin(a) * ry * 0.96;
    g.moveTo(px + rr, py); g.arc(px, py, rr * (0.8 + (i % 3) * 0.15), 0, TAU);
  }
  g.fill();
}
function pointyEar(g, x, y, dir, color, inner, s) {
  // triangle standing up from (x, y) on the head; dir tilts the tip back; s scales it (chihuahuas: big)
  s = s || 1;
  g.fillStyle = color; g.beginPath(); g.moveTo(x - 3.2 * s, y + 1); g.lineTo(x + 3.2 * s, y + 1); g.lineTo(x + dir * 1.8 * s, y - 8.5 * s); g.closePath(); g.fill();
  g.fillStyle = inner; g.beginPath(); g.moveTo(x - 1.5 * s, y + 0.5); g.lineTo(x + 1.5 * s, y + 0.5); g.lineTo(x + dir * 1.2 * s, y - 5.5 * s); g.closePath(); g.fill();
}
// a few brindle stripes across the body, kept inside the ellipse
function stripes(g, bx, by, brx, bry, color) {
  g.strokeStyle = color; g.lineWidth = 2.2; g.lineCap = 'round';
  for (const d of [-8, -3, 2, 7]) {
    const h = bry * Math.sqrt(Math.max(0, 1 - (d / brx) * (d / brx))) * 0.8;
    g.beginPath(); g.moveTo(bx + d + 1.5, by - h); g.lineTo(bx + d - 1.5, by + h); g.stroke();
  }
}
function drawPuppy(g, L, poseName, o) {
  const Gm = GEOM[poseName];
  const wag = o.wag || 0, ex = o.ex || 0, ey = o.ey || 0;
  let [bx, by, brx, bry] = Gm.body;
  let [hx, hy, hr] = Gm.head;
  let legs = Gm.legs;
  let [tx, ty, ta] = Gm.tail;
  const standing = legs.length === 4;
  // body types
  if (L.long) {   // dachshund: gloriously long low body, short legs, head way out front
    brx *= standing ? 1.9 : 1.5; bx -= 2; hx += standing ? 8 : 6;
    if (standing) { by += 1.5; hy += 1.5; ty += 1.5; legs = legs.map(l => [l[0] + (l[0] < 0 ? -6 : 6), l[1] + 3, l[2] - 3]); tx -= 12; } else tx -= 6;
  }
  if (L.slim) bry *= 0.85;   // great dane: lean
  const a = ta + wag;
  // tail
  g.strokeStyle = L.dark; g.lineWidth = L.shaggy ? 5 : 4; g.lineCap = 'round';
  if (L.tail === 'curl' && poseName !== 'sleep') {
    // a curly tail over the back
    g.beginPath(); g.arc(tx - 1, ty - 6 + wag * 2, L.pug ? 3.5 : 4.5, Math.PI * 0.5, Math.PI * 1.9); g.stroke();
  } else {
    g.beginPath(); g.moveTo(tx, ty);
    g.quadraticCurveTo(tx - 5 * Math.cos(a), ty - 5 * Math.sin(a) - 2.5, tx - 10 * Math.cos(a), ty - 10 * Math.sin(a));
    g.stroke();
    if (L.poodle) circ(g, tx - 10 * Math.cos(a), ty - 10 * Math.sin(a), 3.2, L.fur);   // pom-pom on the tip
  }
  // far ear
  if (L.pug) ell(g, hx + 3, hy - 8, 2.6, 3.4, 0.5, L.dark);
  else if (L.ears === 'pointy') pointyEar(g, hx + 2, hy - 7, 1, L.dark, mix(L.dark, '#ffb3c6', 0.5), L.earSize);
  else if (L.poodle) fluff(g, hx - 7, hy + 3, 3.4, 6, L.dark, 8);
  else ell(g, hx - 7.5, hy + 2, 3.2, 6.2, -0.25, L.dark);
  // back legs
  if (standing) { leg(g, legs[0][0], legs[0][1], legs[0][2], L.mid); leg(g, legs[1][0], legs[1][1], legs[1][2], L.mid); }
  // body
  if (L.shaggy) fluff(g, bx, by, brx, bry, L.fur, 18); else ell(g, bx, by, brx, bry, 0, L.fur);
  if (L.pattern === 'saddle') ell(g, bx - 2, by - 3.5, brx * 0.73, 5, 0, L.dark);
  if (L.pattern === 'patch') ell(g, bx - 2, by - 4, 7, 4, 0, L.dark);
  if (L.pattern === 'belly') ell(g, bx + 2, by + 4, brx * 0.62, 3.8, 0, L.light);
  if (L.pattern === 'mask') ell(g, bx - 1, by - 4, brx * 0.7, 4, 0, L.dark);
  if (L.pattern === 'spots') {
    circ(g, bx - 6, by - 3, 2.2, L.spot); circ(g, bx + 1, by + 2, 1.8, L.spot);
    circ(g, bx - 2, by + 5, 1.4, L.spot); circ(g, bx + 6, by - 4, 1.6, L.spot);
  }
  if (L.pattern === 'bigspots') { ell(g, bx - brx * 0.45, by - 2, brx * 0.3, bry * 0.42, 0.3, L.spot); ell(g, bx + brx * 0.3, by + 2, brx * 0.26, bry * 0.36, -0.4, L.spot); }
  if (L.pattern === 'patches') { ell(g, bx - brx * 0.35, by - 3, brx * 0.4, bry * 0.5, 0.2, L.spot); ell(g, bx + brx * 0.45, by + 3, brx * 0.22, bry * 0.4, 0, L.spot); }
  if (L.pattern === 'stripes') stripes(g, bx, by, brx, bry, L.dark);
  if (L.pattern === 'tri') { ell(g, bx + 2, by + 4, brx * 0.6, 3.6, 0, L.light); circ(g, bx + brx * 0.7, by + 1, 4.2, '#ffffff'); }   // tan belly, white chest
  if (L.pattern === 'blaze') circ(g, bx + brx * 0.7, by + 1, 4.5, '#ffffff');   // white chest
  if (L.poodle) fluff(g, bx + brx * 0.55, by + 1, 6, 6.5, L.fur, 10);   // fluffy chest
  if (Gm.haunch) circ(g, Gm.haunch[0], Gm.haunch[1], Gm.haunch[2], L.fur);
  // front legs
  const fl = standing ? legs.slice(2) : legs;
  fl.forEach(l => leg(g, l[0], l[1], l[2], L.fur));
  if (L.poodle) legs.forEach(l => { if (l[2] >= 6) circ(g, l[0], l[1] + l[2] - 3, 3.6, L.fur); });   // pom-poms at the ankles
  // collar
  if (o.collar) {
    ell(g, Gm.collar[0], Gm.collar[1], 2.4, 6.8, -0.35, o.collar);
    circ(g, Gm.collar[0] + 1.6, Gm.collar[1] + 6.2, 1.4, '#ffd54f');
  }
  // head
  if (L.shaggy) fluff(g, hx, hy, hr, hr, L.fur, 14); else circ(g, hx, hy, hr, L.fur);
  if (L.poodle) fluff(g, hx - 1, hy - 7.5, 5.5, 4.5, L.fur, 9);   // top-knot
  if (L.pattern === 'mask') { ell(g, hx - 1, hy - 4, 8.5, 5.5, 0, L.dark); circ(g, hx + 4, hy + 2, 6, L.light); }
  if (L.pattern === 'saddle') ell(g, hx + 5, hy + 1.5, 6, 4.5, 0, L.dark);
  if (L.pattern === 'spots') circ(g, hx - 2, hy - 4, 1.7, L.spot);
  if (L.pattern === 'patch' || L.pattern === 'patches') ell(g, hx - 2, hy - 5, 6, 4, 0, L.pattern === 'patch' ? L.dark : L.spot);
  if (L.pattern === 'bigspots') circ(g, hx + 3, hy - 3, 3.2, L.spot);   // an eye patch
  // near ear
  if (L.pug) ell(g, hx - 4, hy - 7, 2.8, 3.6, -0.5, L.dark);
  else if (L.ears === 'pointy') pointyEar(g, hx - 4, hy - 6, -1, L.dark, mix(L.dark, '#ffb3c6', 0.5), L.earSize);
  else if (L.poodle) fluff(g, hx - 4, hy + 2, 3.8, 6.5, L.dark, 8);
  else ell(g, hx - 4.5, hy + 1, 3.6, 7 * (L.earSize || 1), -0.3, L.dark);
  if (L.pattern === 'blaze') ell(g, hx + 3, hy - 2, 2.2, 7, 0, '#ffffff');   // white stripe down the face
  // snout, nose, mouth
  if (L.pug) {
    // a real pug face: flat, with a dark mask low on the face, the nose pushed up between the eyes, a wide mouth and forehead wrinkles
    ell(g, hx + 3.5, hy + 3.5, 6, 5, 0, L.dark);
    circ(g, hx + 5, hy + 0.2, 1.7, '#1a0f0a');
    g.strokeStyle = '#1a0f0a'; g.lineWidth = 0.9; g.lineCap = 'round';
    g.beginPath(); g.arc(hx + 5, hy + 2.6, 3.2, Math.PI * 0.12, Math.PI * 0.88); g.stroke();
    g.beginPath(); g.moveTo(hx + 5, hy + 1.9); g.lineTo(hx + 5, hy + 5.6); g.stroke();
    g.strokeStyle = L.mid; g.lineWidth = 0.9;
    g.beginPath(); g.arc(hx + 3, hy - 6.5, 3.5, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
    g.beginPath(); g.arc(hx + 3, hy - 4.6, 4.2, Math.PI * 1.2, Math.PI * 1.8); g.stroke();
    if (Gm.tongue) ell(g, hx + 5, hy + 6.3, 1.6, 2.2, 0, '#ff7aa2');
  } else {
    ell(g, hx + 6.5, hy + 2.5, 5.2, 3.9, 0, L.muzzle ? L.dark : L.light);
    circ(g, hx + 10, hy + 0.8, 1.9, '#2b1a12');
    g.strokeStyle = '#2b1a12'; g.lineWidth = 0.8;
    g.beginPath(); g.arc(hx + 8.5, hy + 3.4, 1.6, Math.PI * 0.15, Math.PI * 0.85); g.stroke();
    if (Gm.tongue) ell(g, hx + 8.5, hy + 5.4, 1.5, 2.2, 0, '#ff7aa2');
  }
  // eyes (pugs and chihuahuas: big and wide-set)
  const big = L.pug || L.bigEyes;
  const er = big ? 2.2 : 1.6, e1 = L.pug ? 0.5 : big ? 1.5 : 2.5, e2 = L.pug ? 9.5 : big ? 8.5 : 7.8;
  if (Gm.eyes === 'open') {
    circ(g, hx + e1 + ex, hy - 2.5 + ey, er, '#1b1b1b'); circ(g, hx + e2 + ex, hy - 3 + ey, er, '#1b1b1b');
    circ(g, hx + e1 - 0.5 + ex, hy - 3 + ey, 0.55, '#fff'); circ(g, hx + e2 - 0.5 + ex, hy - 3.5 + ey, 0.55, '#fff');
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

// sprite cache: sprites[look][pose][facing(0 = right, 1 = left)] = [136px, 68px, 34px] mip levels.
// Drawing a pre-shrunk copy is much cheaper (and smoother) than shrinking the big one on every draw.
// (136 wide leaves room for a dachshund's nose and tail.)
const SPR = 136, SPR_SCALE = 2, SPR_OX = 68, SPR_OY = 50;
const sprites = [];
function shrink(src, size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, size, size); return c;
}
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
        const half = shrink(c, SPR / 2);
        sprites[l][p][f] = [c, half, shrink(half, SPR / 4)];
      }
    }
  }
}
// flowers as sprites too (one per colour), so the meadow costs one drawImage per flower instead of six arcs
const flowerSprites = {};
function makeFlowerSprites(cols) {
  for (const col of cols) {
    const c = document.createElement('canvas'); c.width = c.height = 96;
    const g = c.getContext('2d'); g.translate(48, 48); g.scale(48 / 1.4, 48 / 1.4);
    g.fillStyle = col;
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; g.beginPath(); g.arc(Math.cos(a) * 0.8, Math.sin(a) * 0.8, 0.55, 0, TAU); g.fill(); }
    g.fillStyle = '#ffca28'; g.beginPath(); g.arc(0, 0, 0.45, 0, TAU); g.fill();
    flowerSprites[col] = c;
  }
}

// ============================================================ PUPPIES
const puppies = new Array(N);
const shuffledNames = shuffle(NAMES.slice(), mulberry32(20000));
function makePuppies() {
  const pettedStr = store.get('petted' + KEY, '');
  for (let i = 0; i < N; i++) {
    const r = mulberry32(1000 + i * 7919);
    puppies[i] = {
      i, x: rnd(MARGIN + 20, WORLD.w - MARGIN - 20), y: rnd(MARGIN + 20, WORLD.h - MARGIN - 20), vx: 0, vy: 0,
      look: 0, size: 1, name: shuffledNames[i % shuffledNames.length],
      collar: COLLARS[(r() * COLLARS.length) | 0], facing: r() < 0.5 ? 1 : -1,
      state: 'idle', t: r() * 4, tx: 0, ty: 0, obj: null, petted: pettedStr[i] === '1',
      anim: r() * 10, wag: r() * TAU, idlePose: r() < 0.4 ? 'sit' : 'stand', lastPet: -9, fx: 0, fy: 0, px: 0, py: 0
    };
    const p = puppies[i];
    p.look = pickLook(r());
    p.size = LOOKS[p.look].sz * (0.8 + r() * 0.4);   // breed size times individual variation: roughly 0.5x to 1.6x
    p.r = 13 * p.size;
  }
}
function savePetted() { let s = ''; for (let i = 0; i < N; i++) s += puppies[i].petted ? '1' : '0'; store.set('petted' + KEY, s); }

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
// how easily a puppy gets nudged aside: sleepers don't budge, sitting ones barely do
function mobility(p) { return p.state === 'sleep' ? 0 : (p.state === 'idle' || p.state === 'eat' || p.state === 'happy' || p.state === 'potty' || p.state === 'trick' || p.state === 'dance') ? 0.25 : 1; }
// Puppies like a little breathing room: every neighbour closer than COMFORT adds "crowd pressure" (p.px, p.py)
// pointing away from it. Idle puppies that feel too much of it get up and walk off, walking puppies steer by it.
// That is how a called-in pile loosens up again, from the outside in.
const COMFORT = 44, COMFORT2 = COMFORT * COMFORT, CROWD = 150;
const MESS_R = 48;   // nobody wants to stand this close to a potty spot
function separate() {
  for (let i = 0; i < N; i++) { puppies[i].px = 0; puppies[i].py = 0; }
  for (const m of messes) eachNear(m.x, m.y, MESS_R, (p, d) => {
    if (d < 0.5) { p.px += rnd(-300, 300); p.py += rnd(-300, 300); return; }
    const g = 420 * (1 - d / MESS_R);   // stronger than a crowded neighbour: yuck
    p.px += (p.x - m.x) / d * g; p.py += (p.y - m.y) / d * g;
  });
  for (let i = 0; i < N; i++) {
    const p = puppies[i];
    const mp = mobility(p);
    const cx = clamp((p.x / CELL) | 0, 0, GW - 1), cy = clamp((p.y / CELL) | 0, 0, GH - 1);
    for (let yy = Math.max(0, cy - 1); yy <= Math.min(GH - 1, cy + 1); yy++)
      for (let xx = Math.max(0, cx - 1); xx <= Math.min(GW - 1, cx + 1); xx++) {
        let j = heads[yy * GW + xx];
        while (j >= 0) {
          if (j > i) {
            const q = puppies[j];
            let dx = q.x - p.x, dy = q.y - p.y;
            let d2 = dx * dx + dy * dy;
            if (d2 < COMFORT2) {
              if (d2 < 0.01) { dx = rnd(-1, 1); dy = rnd(-1, 1); d2 = dx * dx + dy * dy; }
              const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
              const f = 1 - d / COMFORT, g = CROWD * f * f;
              p.px -= nx * g; p.py -= ny * g; q.px += nx * g; q.py += ny * g;
              const min = p.r + q.r;
              if (d < min) {   // actually overlapping: push apart, heavier one moves less
                const push = (min - d) * 0.5;
                const mq = mobility(q), ms = mp + mq;
                const fp = ms > 0 ? mp / ms : 0.5, fq = ms > 0 ? mq / ms : 0.5;
                p.x -= nx * push * fp; p.y -= ny * push * fp; q.x += nx * push * fq; q.y += ny * push * fq;
              }
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
let HUD_BOTTOM = 84;          // toolbar height (measured on resize), kept clear when the whole world is shown
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
// quality: 0 = full; 1 and 2 lower the canvas resolution (and 2 drops shadows). Only stepped down, automatically,
// when a device can't keep up. Small screens also draw fewer live-vector puppies before falling back to sprites.
let quality = 0, dprCap = 2, qualityChangedAt = 0, vectorMax = 260, miniVisible = true;
function resize() {
  dpr = Math.min(dprCap, window.devicePixelRatio || 1);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  vectorMax = Math.min(W, H) <= 600 ? 100 : 260;
  miniVisible = getComputedStyle(mini).display !== 'none';
  const tb = $('toolbar');
  HUD_BOTTOM = Math.max(60, (tb ? tb.offsetHeight : 0) + 16);   // one row on desktop, two on portrait phones
  clampCam(camT); clampCam(cam);
}
window.addEventListener('resize', resize);
if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);   // toolbar height can change once the font lands
const isPetMode = () => cam.zoom >= PET_ZOOM;
function playerPos() { return toWorld(W / 2, H - HUD_BOTTOM - 70); }

// ============================================================ GAME STATE
let stats = { treats: 0, throws: 0, fetches: 0 };
try { Object.assign(stats, JSON.parse(store.get('stats' + KEY, '{}'))); } catch (e) { }
function saveStats() { store.set('stats' + KEY, JSON.stringify(stats)); }
let pettedCount = 0;
let tool = 'hand';
let formation = null;          // { kind, labels }
const treats = [];
const ball = { active: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, state: 'rest', carrier: null, hx: 0, hy: 0 };
const parts = [];              // world-space particles
const confetti = [];           // screen-space particles
const callPoint = { type: 'point', x: 0, y: 0 };
let calling = false;           // true while the Call tool is held: crowd pressure is ignored so the pile can form
// dance party: a boombox on the grass, puppies nearby come and bounce to the beat
const boombox = { on: false, x: 0, y: 0, t: 0, beat: 0, noteT: 0, recruitT: 0 };
const DANCE_R = 330, DANCE_TIME = 40;
// potty breaks: rare, and they fade after a while
const messes = [];             // { kind: 'poo' | 'pee', x, y, life }
const MESS_LIFE = 45, MESS_MAX = 25, MESS_RATE = 0.00016;   // per idle puppy per second: a handful a minute across 2,000 puppies
let selected = null;           // the puppy whose card is showing (commands act on it)
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
function pickWander(p, awayX, awayY) {
  // with a direction given (crowd pressure), head roughly that way and a bit further than usual
  for (let tries = 0; tries < 4; tries++) {
    const a = awayX !== undefined ? Math.atan2(awayY, awayX) + rnd(-0.6, 0.6) : Math.random() * TAU;
    const d = awayX !== undefined ? rnd(60, 180) : rnd(30, 140);
    p.tx = clamp(p.x + Math.cos(a) * d, MARGIN, WORLD.w - MARGIN);
    p.ty = clamp(p.y + Math.sin(a) * d, MARGIN, WORLD.h - MARGIN);
    if (!messes.some(m => Math.hypot(m.x - p.tx, m.y - p.ty) < MESS_R + 12)) break;   // not next to a potty spot, thanks
  }
  p.state = 'wander'; p.t = 6;
}
function updatePuppy(p, dt) {
  switch (p.state) {
    case 'idle':
      p.t -= dt; damp(p, 8, dt);
      if (!calling && p.px * p.px + p.py * p.py > 40 * 40) { pickWander(p, p.px, p.py); break; }   // too crowded here
      if (!formation && messes.length < MESS_MAX && Math.random() < dt * MESS_RATE) { p.state = 'potty'; p.t = 1.8; p.kind = Math.random() < 0.5 ? 'poo' : 'pee'; p.vx = p.vy = 0; break; }
      if (p.t <= 0) {
        if (Math.random() < 0.06 && now - p.lastPet > 10) { p.state = 'sleep'; p.t = rnd(6, 16); p.vx = p.vy = 0; }
        else pickWander(p);
      }
      break;
    case 'wander': {
      const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
      if (d < 6) { toIdle(p); break; }
      const sp = 34 + p.size * 12;
      steer(p, dx / d * sp, dy / d * sp, 4, dt);
      if (!calling) { p.vx += p.px * dt * 2; p.vy += p.py * dt * 2; }   // drift away from crowds and potty spots on the way
      p.t -= dt; if (p.t <= 0) toIdle(p);
      break;
    }
    case 'flee':
      p.t -= dt; damp(p, 2.5, dt);
      if (p.t <= 0 || Math.hypot(p.vx, p.vy) < 8) toIdle(p, rnd(0.3, 1.5));
      break;
    case 'seek': {
      const o = p.obj;
      if (!o || o.gone || (o.type === 'treat' && o.eaten) || (o.type === 'ball' && (ball.state === 'carried' || !ball.active)) || (o.type === 'dance' && !boombox.on)) { toIdle(p, 0.5); break; }
      const dx = o.x - p.x, dy = o.y - p.y, d = Math.hypot(dx, dy);
      const arrive = o.type === 'point' ? 26 : o.type === 'treat' ? 13 : o.type === 'dance' ? 8 : 15;
      if (d < arrive) {
        if (o.type === 'treat') { o.eaten = true; p.state = 'eat'; p.t = 1.7; p.vx = p.vy = 0; if (dx < 0) p.facing = -1; else p.facing = 1; sfx.crunch(); }
        else if (o.type === 'ball') { if (ball.z < 25) pickUpBall(p); else damp(p, 6, dt); }
        else if (o.type === 'dance') { p.state = 'dance'; p.dance = Math.random(); p.vx = p.vy = 0; p.obj = null; p.facing = p.x < boombox.x ? 1 : -1; }
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
    case 'potty':
      p.t -= dt; damp(p, 8, dt);
      if (p.t <= 0) {
        messes.push({ kind: p.kind, x: p.x - p.facing * 14, y: p.y + 10, life: MESS_LIFE });
        if (messes.length > MESS_MAX) messes.shift();
        pickWander(p);
      }
      break;
    case 'dance':
      if (!boombox.on) { toIdle(p); break; }
      p.dance += dt; damp(p, 6, dt);
      p.facing = ((p.dance * 2) | 0) & 1 ? -1 : 1;   // turn around on every beat
      break;
    case 'trick': {
      p.t -= dt; damp(p, 8, dt);
      const el = p.tmax - p.t;
      p.rot = p.trick === 'roll' && el < 1.4 ? (el / 1.4) * TAU * p.facing : 0;
      if (p.t <= 0) {
        p.rot = 0; p.state = 'happy'; p.t = 2; spawnHearts(p, 2); sfx.yip();
        if (selected === p) showCard(p, 8000, 'Good ' + { sit: 'sit', lie: 'lie down', roll: 'roll', beg: 'beg', jump: 'jump' }[p.trick] + ', ' + p.name + '! 🎉');
      }
      break;
    }
    case 'sleep':
      p.t -= dt; damp(p, 12, dt);
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
// how high off the ground a puppy is drawn (world units): dancing bounces, jumping hops twice
function hopOf(p) {
  if (p.state === 'dance') return Math.abs(Math.sin(p.dance * TAU)) * 5;
  if (p.state === 'trick' && p.trick === 'jump') return Math.abs(Math.sin((p.tmax - p.t) / 0.8 * Math.PI)) * 18;
  if (p.state === 'form' && formation && formation.kind === 'wave') return Math.max(0, -Math.sin(p.fx / 180 - formation.t * 2.2)) * 12;   // hop on the crest
  return 0;
}
function poseOf(p) {
  if (p.state === 'sleep') return P_SLEEP;
  if (p.state === 'eat') return P_EAT;
  if (p.state === 'happy' || p.state === 'dance') return P_HAPPY;
  if (p.state === 'potty') return P_SIT;
  if (p.state === 'trick') return p.trick === 'beg' ? P_BEG : p.trick === 'sit' ? P_SIT : p.trick === 'jump' ? (hopOf(p) > 3 ? P_WALK1 : P_STAND) : P_LIE;
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
    const dx = (x - p.x) / ((LOOKS[p.look].long ? 34 : 22) * p.size), dy = (y - (p.y - 3 * p.size)) / (16 * p.size);
    const d = dx * dx + dy * dy;
    if (d < 1 && d < bd) { bd = d; best = p; }
  });
  return best;
}
function pet(p, first) {
  releaseFormation();
  if (p.state === 'carry') { spawnHearts(p, 1); return; }
  if (!first && now - p.lastPet < 0.35) return;
  p.lastPet = now;
  p.state = 'happy'; p.t = 2.4; p.vx = p.vy = 0; p.obj = null;
  spawnHearts(p, first ? 3 : 1);
  if (!p.petted) {
    p.petted = true; pettedCount++; savePetted(); updateCounter(); checkMilestone();
  }
  if (first) { showCard(p, 8000); sfx.yip(); }
}
// commands from the puppy's card
function doTrick(p, trick) {
  if (!p || p.state === 'carry') return;
  releaseFormation();
  if (p.state === 'dance' || (p.state === 'seek' && p.obj && p.obj.type === 'dance')) p.obj = null;
  p.state = 'trick'; p.trick = trick; p.t = trick === 'roll' ? 2.2 : trick === 'lie' ? 4 : trick === 'jump' ? 1.6 : 3; p.tmax = p.t;
  p.vx = p.vy = 0; p.rot = 0; p.obj = null;
  sfx.pop(); showCard(p, 8000);
}
// dance party
function placeBoombox(x, y) {
  releaseFormation();
  if (boombox.on && dist(x, y, boombox.x, boombox.y) < 40) { stopBoombox(); return; }   // tap the boombox to switch it off
  if (boombox.on) stopBoombox();
  boombox.on = true; boombox.x = x; boombox.y = y; boombox.t = DANCE_TIME; boombox.beat = 0; boombox.recruitT = 0; boombox.noteT = 0;
  stats.dances = (stats.dances || 0) + 1; saveStats();
  sfx.startMusic();
}
function stopBoombox() {
  if (!boombox.on) return;
  boombox.on = false; sfx.stopMusic();
  for (const p of puppies) if (p.state === 'dance' || (p.state === 'seek' && p.obj && p.obj.type === 'dance')) toIdle(p, rnd(0.2, 1.5));
}
const DANCE_MAX = 40;   // dancers at a time, so the floor stays a ring around the boombox rather than a pile on it
function recruitDancers() {
  let dancing = 0;
  for (const p of puppies) if (p.state === 'dance' || (p.state === 'seek' && p.obj && p.obj.type === 'dance')) dancing++;
  if (dancing >= DANCE_MAX) return;
  const cands = [];
  eachNear(boombox.x, boombox.y, DANCE_R, (p, d) => { if (isFree(p)) cands.push([d, p]); });
  cands.sort((a, b) => a[0] - b[0]);
  for (const [, p] of cands.slice(0, DANCE_MAX - dancing)) {
    // everyone gets their own spot on the ring around the boombox
    const a = Math.atan2(p.y - boombox.y, p.x - boombox.x) + rnd(-0.6, 0.6), r = rnd(50, 200);
    p.obj = { type: 'dance', x: clamp(boombox.x + Math.cos(a) * r, MARGIN, WORLD.w - MARGIN), y: clamp(boombox.y + Math.sin(a) * r, MARGIN, WORLD.h - MARGIN) };
    p.state = 'seek'; p.t = 10;
  }
}
function updateBoombox(dt) {
  if (!boombox.on) return;
  boombox.t -= dt; boombox.beat += dt * 2;   // 120 bpm
  boombox.recruitT -= dt; if (boombox.recruitT <= 0) { recruitDancers(); boombox.recruitT = 1.5; }
  boombox.noteT -= dt;
  if (boombox.noteT <= 0) {
    boombox.noteT = 0.28;
    parts.push({ kind: 'note', x: boombox.x + rnd(-10, 10), y: boombox.y - 12, vx: rnd(-12, 12), vy: rnd(-42, -28), life: 1.8, max: 1.8,
      c: ['#ff6fa3', '#4fc3f7', '#ffd54f', '#ba68c8', '#81c784'][(Math.random() * 5) | 0], ch: Math.random() < 0.5 ? '♪' : '♫', ph: Math.random() * TAU });
  }
  if (boombox.t <= 0) stopBoombox();
}
function updateMesses(dt) {
  for (let i = messes.length - 1; i >= 0; i--) { messes[i].life -= dt; if (messes[i].life <= 0) messes.splice(i, 1); }
}
function dropTreat(x, y) {
  releaseFormation();
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
  releaseFormation();
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
  } else if (kind === 'smiley') {
    const cx = cw / 2, cy = ch / 2, R = ch * 0.42;
    g.strokeStyle = '#fff'; g.lineCap = 'round';
    g.lineWidth = R * 0.17; g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();                                          // face
    for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * R * 0.36, cy - R * 0.28, R * 0.13, 0, TAU); g.fill(); }       // eyes
    g.lineWidth = R * 0.15; g.beginPath(); g.arc(cx, cy + R * 0.05, R * 0.6, Math.PI * 0.15, Math.PI * 0.85); g.stroke();   // smile
  } else {
    const lines = kind === 'name' && kidName ? [kidName.toUpperCase(), String(N)] : [String(N)];
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
  // blocks of 100 (10 x 10), the last one partial, labelled 100, 200, ... up to N
  const pts = [], labels = [], sp = 28, bw = 9 * sp;
  const nBlocks = Math.ceil(N / 100);
  // column count: fewest empty slots on the last row, then closest to the field's 3:2 shape
  let cols = 1, best = Infinity;
  for (let c = Math.min(nBlocks, 3); c <= Math.min(nBlocks, 7); c++) {
    const rows = Math.ceil(nBlocks / c), score = (c * rows - nBlocks) * 10 + Math.abs(c / rows - 1.5);
    if (score < best) { best = score; cols = c; }
  }
  const rows = Math.ceil(nBlocks / cols);
  const gapX = (WORLD.w - cols * bw) / (cols + 1), gapY = (WORLD.h - rows * bw) / (rows + 1);
  for (let b = 0; b < nBlocks; b++) {
    const col = b % cols, row = (b / cols) | 0;
    const x0 = gapX + col * (bw + gapX), y0 = gapY + 24 + row * (bw + gapY);
    const inBlock = Math.min(100, N - b * 100);
    for (let k = 0; k < inBlock; k++) pts.push([x0 + (k % 10) * sp, y0 + ((k / 10) | 0) * sp]);
    labels.push({ x: x0 + bw / 2, y: y0 - 34, text: String(Math.min((b + 1) * 100, N)) });
  }
  return { pts, labels };
}
// Dynamic formations: slot k's target position at time t. Puppies chase their moving slot.
const DYN = {
  // a marching band: 10 abreast, ranks trailing back along an oval parade route, advancing at walking pace
  band(t, k) {
    const cols = 10, rank = (k / cols) | 0, col = k % cols;
    const a = 1300, b = 780, ravg = 1040;
    const th = t * 0.06 - (rank * 30) / ravg;
    let nx = Math.cos(th) / a, ny = Math.sin(th) / b; const nl = Math.hypot(nx, ny); nx /= nl; ny /= nl;   // outward normal
    const off = (col - (cols - 1) / 2) * 28;
    return [1500 + a * Math.cos(th) + nx * off, 1000 + b * Math.sin(th) + ny * off];
  },
  // a firework 🎆: a glowing ball high on the field bursts into 40 streams of sparks that fly out on
  // ballistic arcs and fall, each spark a little later than the one before it so the streams curve;
  // then the sparks run back into the ball and it goes again
  firework(t, k) {
    const S = 20, s = k % S, idx = (k / S) | 0, per = Math.ceil(N / S);
    const T = 14, FLY = 7, u = t % T;
    const ox = 1500, oy = 650, a = s / S * TAU + 0.03 * (idx % 3), g = 45, delay = idx / per * 5;   // each stream is 5 s of sparks long
    const v = 150 * (1 - 0.45 * Math.max(0, Math.sin(a)));   // streams pointing down don't fly as far (the ground is close)
    const br = 20 + idx / per * 130;
    const ball = [ox + Math.cos(a) * br, oy + Math.sin(a) * br];
    const flight = tau => tau <= 0 ? ball : [ox + Math.cos(a) * v * tau, oy + Math.sin(a) * v * tau + g * tau * tau / 2];
    if (u < FLY) return flight(u - delay);
    const end = flight(FLY - delay), f = Math.min(1, (u - FLY) / 5), e = f * f * (3 - 2 * f);   // 5 s back to the ball, then wait
    return [end[0] + (ball[0] - end[0]) * e, end[1] + (ball[1] - end[1]) * e];
  },
  // a wave rolling through a grid, 50 across
  wave(t, k) {
    const cols = 50, col = k % cols, row = (k / cols) | 0, rows = Math.ceil(N / cols), rowSp = Math.min(40, 1500 / rows);
    const x = 275 + col * 50, y = 1000 - (rows - 1) * rowSp / 2 + row * rowSp;
    return [x, y + Math.sin(x / 180 - t * 2.2) * 45];
  }
};
function startFormation(kind) {
  let pts, labels = [];
  const dyn = DYN[kind];
  if (dyn) {
    // pair puppies with slots along the same ordering (angle around the centre, or x for the wave) so nobody crosses the whole field
    const slots = []; for (let k = 0; k < N; k++) { const [x, y] = dyn(kind === 'firework' ? 3 : 0, k); slots.push([k, x, y]); }
    const key = kind === 'wave' ? (o => o[1]) : (o => Math.atan2(o[2] - 1000, o[1] - 1500));
    slots.sort((a, b) => key(a) - key(b));
    const order = puppies.slice().sort((a, b) => key([0, a.x, a.y]) - key([0, b.x, b.y]));
    for (let i = 0; i < N; i++) { const p = order[i]; p.slot = slots[i][0]; p.fx = clamp(slots[i][1], MARGIN, WORLD.w - MARGIN); p.fy = clamp(slots[i][2], MARGIN, WORLD.h - MARGIN); }
    formation = { kind, labels, dyn, t: 0, lastU: Infinity };
  } else {
    if (kind === 'count') ({ pts, labels } = countPoints());
    else pts = shapePoints(kind);
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const order = puppies.slice().sort((a, b) => a.x - b.x);
    for (let i = 0; i < N; i++) { const p = order[i]; p.fx = clamp(pts[i][0], MARGIN, WORLD.w - MARGIN); p.fy = clamp(pts[i][1], MARGIN, WORLD.h - MARGIN); }
    formation = { kind, labels };
  }
  for (const p of puppies) if (p.state !== 'carry' && p.state !== 'eat') { p.state = 'form'; p.obj = null; }
  $('btn-surprise').classList.add('on');
  camT.zoom = minZoom(); camT.x = WORLD.w / 2; camT.y = WORLD.h / 2; clampCam(camT);
  sfx.chime();
}
// Using any tool on the field while a shape is showing sets the puppies free again.
function releaseFormation() {
  if (!formation) return;
  endFormation();
  showToast('Run free, puppies! 🐾', 2000);
}
function updateFormation(dt) {
  if (!formation || !formation.dyn) return;
  formation.t += dt;
  for (const p of puppies) { const [x, y] = formation.dyn(formation.t, p.slot); p.fx = clamp(x, MARGIN, WORLD.w - MARGIN); p.fy = clamp(y, MARGIN, WORLD.h - MARGIN); }
  if (formation.kind === 'firework') {
    const u = formation.t % 14;
    if (u < formation.lastU) { burstConfetti(W / 2 + (1500 - cam.x) * cam.zoom, H / 2 + (650 - cam.y) * cam.zoom, 220, 650); sfx.pop(); }   // the burst
    formation.lastU = u;
  }
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
  let seq = null, seqStep = 0, seqNext = 0;
  const BASS = [110, 0, 110, 0, 146.8, 0, 110, 0, 130.8, 0, 110, 0, 98, 0, 110, 0];
  const LEAD = [440, 0, 523, 0, 587, 0, 523, 0, 440, 0, 392, 0, 440, 0, 0, 0];
  function musicStep(s, d) {
    if (s % 4 === 0) tone(160, 45, 0.16, 'sine', 0.35, d);            // kick
    if (s % 8 === 4) tone(900, 200, 0.12, 'triangle', 0.12, d);       // snare-ish
    if (s % 4 === 2) tone(7000, 3000, 0.04, 'square', 0.025, d);      // hat
    if (BASS[s]) tone(BASS[s], BASS[s] * 0.98, 0.2, 'sawtooth', 0.06, d);
    if (LEAD[s]) tone(LEAD[s], LEAD[s], 0.18, 'triangle', 0.06, d);
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
    // the boombox: a little 16-step loop at 120 bpm, scheduled a beat ahead
    startMusic() {
      const a = actx(); if (!a || seq) return;
      seqStep = 0; seqNext = a.currentTime + 0.05;
      seq = setInterval(() => {
        const a2 = actx(); if (!a2) return;
        while (seqNext < a2.currentTime + 0.3) { musicStep(seqStep, Math.max(0, seqNext - a2.currentTime)); seqStep = (seqStep + 1) % 16; seqNext += 0.125; }
      }, 80);
    },
    stopMusic() { if (seq) clearInterval(seq); seq = null; },
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
    else if (tool === 'dance') placeBoombox(x, y);
  }
  // a plain click/tap on the grass with the hand (no drag, no pinch) also counts as using it
  if (gesture && gesture.type === 'pan' && !pt.moved && pointers.size === 1 && tool === 'hand') releaseFormation();
  pointers.delete(e.pointerId);
  if (pointers.size === 0) gesture = null;
  else if (pointers.size === 1 && gesture && gesture.type === 'pinch') { gesture = { type: 'idle' }; pinch = null; }
  updateCursor();
}
canvas.addEventListener('pointerup', endPointer);
canvas.addEventListener('pointercancel', endPointer);
canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') mouse.inside = false; });
// Scroll wheel / trackpad zoom. Listening on the window means it also works over the HUD panels.
window.addEventListener('wheel', e => {
  if (!$('intro').classList.contains('hidden') || !$('help').classList.contains('hidden')) return; // let overlays scroll
  e.preventDefault();
  if (intro) return;   // the reveal plays through; controls wake up when the count reaches the end
  // normalise: deltaMode 0 = pixels, 1 = lines (Firefox), 2 = pages
  let dy = e.deltaY;
  if (e.deltaMode === 1) dy *= 16; else if (e.deltaMode === 2) dy *= H;
  dy = clamp(dy, -240, 240);
  zoomAt(e.clientX, e.clientY, camT.zoom * Math.exp(-dy * 0.0025), false);
}, { passive: false });
canvas.addEventListener('dblclick', e => { if (intro) return; zoomAt(e.clientX, e.clientY, camT.zoom * 2, false); });
canvas.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('gesturestart', e => e.preventDefault());
window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || intro) return;
  const step = 60;
  if (e.key === 'ArrowLeft' || e.key === 'a') panBy(step, 0);
  else if (e.key === 'ArrowRight' || e.key === 'd') panBy(-step, 0);
  else if (e.key === 'ArrowUp' || e.key === 'w') panBy(0, step);
  else if (e.key === 'ArrowDown' || e.key === 's') panBy(0, -step);
  else if (e.key === '+' || e.key === '=') zoomAt(W / 2, H / 2, camT.zoom * 1.4, false);
  else if (e.key === '-' || e.key === '_') zoomAt(W / 2, H / 2, camT.zoom / 1.4, false);
  else if (e.key === '1') setTool('hand'); else if (e.key === '2') setTool('call');
  else if (e.key === '3') setTool('treat'); else if (e.key === '4') setTool('ball'); else if (e.key === '5') setTool('dance');
  else if (e.key === 'Escape') { closeMenu(); $('help').classList.add('hidden'); }
});
// the mouse cursor matches the tool (see the cur-* rules in style.css)
function updateCursor() {
  let cls = '';
  if (intro) cls = '';
  else if (gesture && (gesture.type === 'pan' || gesture.type === 'pinch')) cls = 'cur-grabbing';
  else if (tool === 'hand') {
    if (!isPetMode()) cls = 'cur-shoo';
    else { const w = toWorld(mouse.x, mouse.y); cls = mouse.inside && puppyAt(w.x, w.y) ? 'cur-pet' : 'cur-grab'; }
  } else cls = 'cur-' + tool;
  if (canvas.className !== cls) canvas.className = cls;
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
// Toolbar: Hand and Call are top-level; Treat, Ball and Dance live in the Play menu, whose button shows the chosen one.
const PLAY_TOOLS = { treat: ['🦴', 'Treat'], ball: ['🎾', 'Ball'], dance: ['📻', 'Dance'] };
function setTool(t) {
  tool = t;
  document.querySelectorAll('#toolbar .tool').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  const play = PLAY_TOOLS[t];
  $('btn-play').classList.toggle('active', !!play);
  if (play) { $('play-icon').textContent = play[0]; $('play-label').textContent = play[1]; }
  document.querySelectorAll('#play-menu button').forEach(b => b.classList.toggle('active', b.dataset.tool === t));
  updateCursor();
}
document.querySelectorAll('[data-tool]').forEach(b => b.addEventListener('click', () => { sfx.unlock(); setTool(b.dataset.tool); closeMenu(); }));
// pop-up menus: a button with data-menu toggles its menu; opening one closes the others
function closeMenu() { document.querySelectorAll('.menu').forEach(m => m.classList.add('hidden')); }
document.querySelectorAll('[data-menu]').forEach(b => b.addEventListener('click', () => {
  sfx.unlock();
  const m = $(b.dataset.menu), wasOpen = !m.classList.contains('hidden');
  closeMenu();
  if (!wasOpen) m.classList.remove('hidden');
}));
$('btn-zoomin').addEventListener('click', () => { if (intro) return; zoomAt(W / 2, H / 2, camT.zoom * 1.6, false); });
$('btn-zoomout').addEventListener('click', () => { if (intro) return; zoomAt(W / 2, H / 2, camT.zoom / 1.6, false); });
$('btn-all').addEventListener('click', () => { if (intro) return; camT.zoom = minZoom(); camT.x = WORLD.w / 2; camT.y = WORLD.h / 2; clampCam(camT); });
document.querySelectorAll('#surprise-menu button').forEach(b => b.addEventListener('click', () => {
  closeMenu(); if (intro) return;
  if (b.dataset.form === 'free') endFormation(); else startFormation(b.dataset.form);
}));
$('btn-sound').addEventListener('click', () => { sfx.muted = !sfx.muted; updateSoundIcon(); if (!sfx.muted) { sfx.unlock(); sfx.pop(); } });
function updateSoundIcon() { $('sound-icon').textContent = sfx.muted ? '🔇' : '🔊'; $('sound-label').textContent = sfx.muted ? 'Sound off' : 'Sound on'; }
$('btn-help').addEventListener('click', () => {
  closeMenu();
  $('help-stats').textContent = 'Treats given: ' + stats.treats + ' · Balls thrown: ' + stats.throws + ' · Fetches: ' + stats.fetches + ' · Dance parties: ' + (stats.dances || 0);
  $('help').classList.remove('hidden');
});
// commands on the puppy card
$('card').addEventListener('click', e => {
  const b = e.target.closest('button[data-cmd]');
  if (b && selected) { sfx.unlock(); doTrick(selected, b.dataset.cmd); }
});
$('btn-close-help').addEventListener('click', () => $('help').classList.add('hidden'));
$('btn-replay').addEventListener('click', () => { $('help').classList.add('hidden'); endFormation(); startIntro(); });
$('btn-reset').addEventListener('click', () => {
  if (!confirm('Reset all petting progress? (Name and birthday are kept.)')) return;
  for (const p of puppies) p.petted = false;
  pettedCount = 0; stats = { treats: 0, throws: 0, fetches: 0 }; store.del('petted' + KEY); saveStats(); updateCounter();
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
  selected = p;
  $('card').innerHTML = (override ? '<div class="name">' + override + '</div>' : '<div class="name">' + p.name + '</div>') +
    '<div class="day">Puppy <b>#' + fmtNum(n) + '</b>, ' + dayLine + '<br>' + fmtDate(dayDate(n)) + (p.petted ? ' · 💗 petted' : '') + '</div>' +
    '<div class="cmds"><button data-cmd="sit">Sit <span class="em">🐕</span></button><button data-cmd="lie">Lie down <span class="em">🛏️</span></button>' +
    '<button data-cmd="roll">Roll over <span class="em">🔄</span></button><button data-cmd="beg">Beg <span class="em">🙏</span></button><button data-cmd="jump">Jump <span class="em">⬆️</span></button></div>';
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
  1500: '1,500! Only 500 puppies are still waiting!', 1750: '1,750! Almost every puppy!', 2000: 'TWO THOUSAND puppies petted! 🎆', 2500: '2,500 puppies petted! 🎆' };
function checkMilestone() {
  const all = pettedCount === N;
  const m = all ? 'ALL ' + fmtNum(N) + ' PUPPIES! 🎆🎉 Every single one loves you!' : MILESTONES[pettedCount];
  if (!m) return;
  showToast(m, all || pettedCount >= 1000 ? 6000 : 3500);
  burstConfetti(W / 2, H * 0.4, 120, 500);
  if (all) { sfx.fanfare(); fireworksUntil = now + 12; setTimeout(() => startFormation('heart'), 800); }
  else sfx.chime();
}

// ============================================================ INTRO
function refreshIntroText() {
  const lastDay = dayDate(N), a = ageParts(birthday, lastDay);
  const parts = [];
  if (a.y) parts.push(a.y + (a.y === 1 ? ' year' : ' years'));
  if (a.m) parts.push(a.m + (a.m === 1 ? ' month' : ' months'));
  parts.push(a.d + (a.d === 1 ? ' day' : ' days'));
  const age = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1] : parts[0];
  $('intro-days').textContent = 'Day ' + fmtNum(N) + ' is ' + fmtDate(lastDay) + '. That is ' + age + '!';
  $('intro-days').style.display = tooMany ? 'none' : '';   // "day 2,600 was in 1995" would only confuse a grown-up
  $('title').textContent = '🐶 ' + N + ' Puppies' + (kidName ? ' for ' + kidName : '');
  $('form-name').textContent = kidName ? '✨ Spell "' + kidName + '"' : '✨ Make a big ' + N;
  document.title = kidName ? N + ' Puppies for ' + kidName + '!' : N + ' Puppies!';
  // every "2,000" in the page text follows the chosen number of days
  document.querySelectorAll('.n').forEach(e => { e.textContent = fmtNum(N); });
  document.querySelectorAll('.n-plain').forEach(e => { e.textContent = String(N); });
  $('alive-days').textContent = fmtNum(tooMany || N);
  $('too-many').classList.toggle('hidden', !tooMany);
  if (tooMany) $('too-many').textContent = 'Whoa, ' + fmtNum(tooMany) + ' days?! 🤯 That is more puppies than fit on our field. We drew the most we could, ' +
    fmtNum(MAX_DAYS) + ' of them. The other ' + fmtNum(tooMany - MAX_DAYS) + ' are at the park chasing squirrels. 🐿️';
  $('fact-time').textContent = N >= 120 ? Math.round(N / 60) + ' minutes' : N + ' seconds';
  const fields = Math.max(1, Math.round(N * 0.4 / 100));
  $('fact-fields').textContent = fields + (fields === 1 ? ' football field' : ' football fields');
  const years = Math.floor(N / 365.25), months = Math.floor(N / 30.44);
  $('fact-years').textContent = years >= 1 ? 'more than ' + years + (years === 1 ? ' year' : ' years') : months >= 2 ? 'more than ' + months + ' months' : 'a lot of days';
}
$('name-input').value = kidName;
$('bday-input').value = ymd(birthday);
$('name-input').addEventListener('input', () => { kidName = $('name-input').value.trim(); store.set('name', kidName); refreshIntroText(); });
$('bday-input').addEventListener('change', () => { const d = parseDate($('bday-input').value); if (d) { birthday = d; store.set('bday', ymd(d)); refreshIntroText(); } });
$('days-input').value = N;
$('days-input').addEventListener('change', () => {
  // the puppy count is baked into everything, so changing it reloads the page with ?days=
  const d = clamp(parseInt($('days-input').value, 10) || N, 10, MAX_DAYS);
  $('days-input').value = d;
  if (d === N) return;
  store.set('days', String(d));
  const u = new URL(location.href); u.searchParams.set('days', String(d));
  if (urlBirthday) { store.set('bday', ymd(urlBirthday)); u.searchParams.delete('birthday'); }   // a birthday in the link would override days
  location.href = u.toString();
});
$('btn-start').addEventListener('click', () => {
  sfx.unlock();
  kidName = $('name-input').value.trim(); store.set('name', kidName); refreshIntroText();
  $('intro').classList.add('hidden');
  startIntro();
});
function startIntro() {
  endFormation(); closeMenu();
  document.body.classList.add('intro-running');   // controls are disabled until the count reaches the end
  const p = puppies[0];
  p.x = clamp(p.x, 300, WORLD.w - 300); p.y = clamp(p.y, 300, WORLD.h - 300);
  p.state = 'happy'; p.t = 3;
  cam.x = camT.x = p.x; cam.y = camT.y = p.y - 6; cam.zoom = camT.zoom = 5;
  intro = { t: 0, sx: cam.x, sy: cam.y, done: false };
  $('card').classList.add('hidden'); selected = null;   // no puppy starts out selected
  $('bignum-n').textContent = '1'; $('bignum-label').textContent = 'puppy';
  $('bignum').classList.remove('hidden');
}
function skipIntro() {
  // jump straight to the end of the reveal (the whole field, all 2,000 in view)
  if (!intro) return;
  intro.t = INTRO_HOLD + 9; intro.seen = N; intro.shown = N;
  updateIntro(0);
}
const INTRO_HOLD = 0.6;   // a short beat on puppy #1 before the zoom-out; the count starts ticking right away
function updateIntro(dt) {
  intro.t += dt;
  const p = puppies[0];
  const prog = clamp((intro.t - INTRO_HOLD) / 9, 0, 1), e = easeInOut(prog);
  if (intro.t < INTRO_HOLD) { cam.x = camT.x = p.x; cam.y = camT.y = p.y - 6; if (p.state !== 'happy') { p.state = 'happy'; p.t = 1; } }
  else {
    cam.zoom = Math.exp(lerp(Math.log(5), Math.log(minZoom()), e));
    cam.x = lerp(intro.sx, WORLD.w / 2, e); cam.y = lerp(intro.sy, WORLD.h / 2, e);
    clampCam(cam); Object.assign(camT, cam);
  }
  // The count only ever climbs (the view can drift off a dense patch while panning), and it is animated:
  // one puppy at a time at first, so a kid can read 1, 2, 3, 4... before it races up to 2,000.
  intro.seen = prog >= 1 ? N : Math.max(intro.seen || 1, visibleCount);
  const shown = intro.shown || 1;
  intro.shown = Math.min(intro.seen, shown + (shown < 10 ? 2.5 : shown * 1.5) * dt);   // 1..10 at 400 ms each, then faster
  const n = Math.floor(intro.shown);
  $('bignum-n').textContent = fmtNum(n); $('bignum-label').textContent = n === 1 ? 'puppy' : 'puppies';
  if (prog >= 1 && n >= N) {
    intro = null;
    document.body.classList.remove('intro-running');
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
const dotBuckets = []; for (let i = 0; i < LOOKS.length * 2; i++) dotBuckets.push([]);
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
    ctx.drawImage(flowerSprites[f.c], f.x - 1.4 * f.s, f.y - 1.4 * f.s, 2.8 * f.s, 2.8 * f.s);
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
  // potty breaks (with flies)
  if (z > 0.45) for (const m of messes) {
    if (m.x < vx0 || m.x > vx1 || m.y < vy0 || m.y > vy1) continue;
    const a = Math.min(1, m.life / 5);
    if (m.kind === 'pee') { ctx.globalAlpha = a * 0.55; ctx.fillStyle = '#ffe14d'; ctx.beginPath(); ctx.ellipse(m.x, m.y, 9, 5, 0, 0, TAU); ctx.fill(); }
    else {
      ctx.globalAlpha = a; ctx.fillStyle = '#6d4c2a'; ctx.strokeStyle = '#4e3418'; ctx.lineWidth = 0.8;
      for (const [dx, dy, r] of [[0, 0, 5], [0.3, -3.3, 3.8], [0.8, -6, 2.4]]) { ctx.beginPath(); ctx.ellipse(m.x + dx, m.y + dy, r, r * 0.7, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    }
    ctx.globalAlpha = a; ctx.fillStyle = '#222';
    const nf = m.kind === 'poo' ? 3 : 1;
    for (let i = 0; i < nf; i++) {
      const fx = m.x + Math.cos(now * 6 + i * 2.1 + m.x) * 9, fy = m.y - 9 + Math.sin(now * 9.3 + i * 1.7) * 4;
      ctx.fillRect(fx - 0.8, fy - 0.8, 1.6, 1.6);
    }
    ctx.globalAlpha = 1;
  }
  // boombox
  if (boombox.on) {
    const pulse = 1 + 0.07 * Math.abs(Math.sin(boombox.beat * Math.PI));
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(boombox.x, boombox.y + 11, 18, 5, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.translate(boombox.x, boombox.y); ctx.scale(pulse, pulse);
    ctx.fillStyle = '#37474f'; ctx.fillRect(-17, -10, 34, 20);
    ctx.strokeStyle = '#263238'; ctx.lineWidth = 1.5; ctx.strokeRect(-17, -10, 34, 20);
    ctx.beginPath(); ctx.arc(0, -10, 8, Math.PI, TAU); ctx.stroke();                   // handle
    for (const sx of [-9, 9]) {
      ctx.fillStyle = '#90a4ae'; ctx.beginPath(); ctx.arc(sx, 1, 6.2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#263238'; ctx.beginPath(); ctx.arc(sx, 1, 3.5 * pulse, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#80cbc4'; ctx.fillRect(-4, -8, 8, 4);                            // cassette window
    ctx.restore();
  }
  // ball shadow
  if (ball.active) { ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(ball.x, ball.y + 4, 7 * (1 - ball.z / 600), 3.5 * (1 - ball.z / 600), 0, 0, TAU); ctx.fill(); }

  // collect visible puppies
  visible.length = 0;
  for (let i = 0; i < N; i++) { const p = puppies[i]; if (p.x >= vx0 && p.x <= vx1 && p.y >= vy0 && p.y <= vy1) visible.push(p); }
  visibleCount = visible.length;
  const useVector = z >= 2.2 && visible.length <= vectorMax;
  const dots = z * 24 < 5;                       // below ~5px a puppy is a coloured dot
  if (!dots) visible.sort((a, b) => a.y - b.y);  // depth order only matters once you can see legs
  // shadows
  if (!dots && z * 24 > 9 && quality < 2) {
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    for (const p of visible) { const s = p.size; ctx.moveTo(p.x + 11 * s, p.y + 12 * s); ctx.ellipse(p.x, p.y + 12 * s, 11 * s, 4 * s, 0, 0, TAU); }
    ctx.fill();
  }
  const pw = mouse.inside ? toWorld(mouse.x, mouse.y) : null;
  if (dots) {
    // batch by colour: one path + one fill per colour instead of 2,000 fillStyle changes
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const r = Math.max(1, z * 12), d2 = r * 2;
    for (const b of dotBuckets) b.length = 0;
    for (const p of visible) dotBuckets[p.look * 2 + (p.petted ? 1 : 0)].push(p);
    for (let b = 0; b < dotBuckets.length; b++) {
      const arr = dotBuckets[b]; if (!arr.length) continue;
      ctx.fillStyle = (b & 1) ? LOOKS[b >> 1].dotPetted : LOOKS[b >> 1].dot;
      ctx.beginPath();
      for (const p of arr) ctx.rect(ox + p.x * z - r, oy + p.y * z - r, d2, d2);
      ctx.fill();
    }
  } else if (!useVector) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    for (const p of visible) {
      const s = z * p.size, k = s / SPR_SCALE, px = SPR * k;
      const sx = ox + p.x * z, sy = oy + p.y * z;
      const pose = poseOf(p);
      const lv = sprites[p.look][pose][p.facing < 0 ? 1 : 0];
      const img = px >= SPR * 0.75 ? lv[0] : px >= SPR * 0.375 ? lv[1] : lv[2];
      if (p.rot) {   // rolling over: spin the sprite about the body centre
        ctx.setTransform(dpr, 0, 0, dpr, dpr * sx, dpr * sy); ctx.rotate(p.rot);   // translation is in device pixels
        ctx.drawImage(img, -SPR_OX * k, -SPR_OY * k, px, px);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        continue;
      }
      const hop = hopOf(p) * s;
      ctx.drawImage(img, sx - SPR_OX * k, sy - SPR_OY * k - hop, px, px);
      if (p.petted && s > 0.5 && !hop) {
        // the collar as it looks up close: only the band under the chin shows (the head hides the rest), plus the tag
        const c = GEOM[POSES[pose]].collar, cx = sx + c[0] * s * p.facing, cy = sy + c[1] * s, rot = -0.35 * p.facing;
        ctx.fillStyle = p.collar; ctx.beginPath(); ctx.ellipse(cx, cy, 2.8 * s, 6.8 * s, rot, Math.PI * 0.12, Math.PI * 0.88); ctx.closePath(); ctx.fill();
        const tx = cx + 1.6 * s * p.facing, ty = cy + 6.2 * s;
        ctx.fillStyle = '#ffd54f'; ctx.beginPath(); ctx.arc(tx, ty, 1.4 * s, 0, TAU); ctx.fill();
      }
    }
  } else {
    for (const p of visible) {
      const s = z * p.size;
      const hop = hopOf(p);
      ctx.setTransform(dpr * s * p.facing, 0, 0, dpr * s, dpr * (ox + p.x * z), dpr * (oy + (p.y - hop) * z));
      if (p.rot) ctx.rotate(p.rot * p.facing);
      else if (p.state === 'dance') ctx.rotate(Math.sin(p.dance * TAU) * 0.12);   // a little wiggle with each bounce
      const pose = POSES[poseOf(p)];
      const o = { collar: p.petted ? p.collar : null, wag: Math.sin(p.wag) * (p.state === 'happy' || p.state === 'dance' ? 0.5 : 0.18) };
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
    if (dots && q.kind !== 'heart') continue;   // sleep z's and crumbs would dwarf 3px puppies
    const a = Math.min(1, q.life / q.max * 1.5);
    if (q.kind === 'heart') {
      const s = dots ? 4 / z : Math.max(5, 9 / z);
      ctx.fillStyle = q.c; ctx.globalAlpha = a;
      ctx.beginPath(); ctx.moveTo(q.x, q.y + s * 0.6);
      ctx.bezierCurveTo(q.x - s, q.y - s * 0.3, q.x - s * 0.5, q.y - s, q.x, q.y - s * 0.4);
      ctx.bezierCurveTo(q.x + s * 0.5, q.y - s, q.x + s, q.y - s * 0.3, q.x, q.y + s * 0.6); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (q.kind === 'crumb') { ctx.fillStyle = q.c; ctx.fillRect(q.x - 1.2, q.y - 1.2, 2.4, 2.4); }
    else if (q.kind === 'note') {
      ctx.globalAlpha = a; ctx.fillStyle = q.c; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.8;
      ctx.font = '700 ' + Math.max(12, 9 / z) + 'px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const nx = q.x + Math.sin(now * 5 + q.ph) * 4;
      ctx.strokeText(q.ch, nx, q.y); ctx.fillText(q.ch, nx, q.y); ctx.globalAlpha = 1;
    }
    else if (q.kind === 'zz') {
      ctx.globalAlpha = a; ctx.fillStyle = '#fff'; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = 0.8;
      ctx.font = '700 ' + Math.max(10, 7 / z) + 'px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
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
  if (!miniVisible || (miniFrame++ & 3) !== 0) return;
  const mw = mini.width, mh = mini.height, kx = mw / WORLD.w, ky = mh / WORLD.h;
  mctx.fillStyle = '#6dbf5c'; mctx.fillRect(0, 0, mw, mh);
  for (let i = 0; i < N; i++) { const p = puppies[i]; mctx.fillStyle = p.petted ? '#ff6fa3' : '#5b3a1e'; mctx.fillRect(p.x * kx - 0.75, p.y * ky - 0.75, 1.5, 1.5); }
  const vw = W / cam.zoom * kx, vh = H / cam.zoom * ky;
  mctx.strokeStyle = '#fff'; mctx.lineWidth = 2;
  mctx.strokeRect(cam.x * kx - vw / 2, cam.y * ky - vh / 2, vw, vh);
}

// ============================================================ MAIN LOOP
let last = performance.now();
let frameCost = 0;            // smoothed ms of work per frame (excludes vsync wait)
function frame(t) {
  requestAnimationFrame(frame);
  if (t - last < 12) return;           // 120 Hz phones: simulate and draw at 60, halving the work
  let dt = (t - last) / 1000; last = t;
  if (dt > 0.1) dt = 0.1; if (dt <= 0) return;
  const t0 = performance.now();
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
    if (gesture && gesture.type === 'shoo') { const pt = [...pointers.values()][0]; sx = pt.x; sy = pt.y; vx = pt.vx; vy = pt.vy; if (pt.moved) releaseFormation(); }
    else { sx = mouse.x; sy = mouse.y; vx = mouse.vx; vy = mouse.vy; }
    const w = toWorld(sx, sy);
    shoo(w.x, w.y, SHOO_PX / cam.zoom, vx / cam.zoom, vy / cam.zoom, dt);
  }
  mouse.vx *= 0.85; mouse.vy *= 0.85;
  calling = !!(gesture && gesture.type === 'call' && pointers.size);
  if (calling) { releaseFormation(); const pt = [...pointers.values()][0]; const w = toWorld(pt.x, pt.y); callPuppies(w.x, w.y, CALL_PX / cam.zoom); }
  // simulate
  updateFormation(dt);
  for (let i = 0; i < N; i++) updatePuppy(puppies[i], dt);
  rebuildGrid();
  separate();
  updateBall(dt);
  updateBoombox(dt);
  updateMesses(dt);
  updateParts(dt);
  if (now < fireworksUntil && Math.random() < dt * 2.5) burstConfetti(rnd(W * 0.15, W * 0.85), rnd(H * 0.15, H * 0.5), 60, 400);
  render();
  renderMini();
  if (mouse.inside) updateCursor();   // zooming changes what the hand does, so keep the cursor in step
  frameCost = lerp(frameCost, performance.now() - t0, 0.05);
  // still too slow for 60 fps after a few seconds? drop the canvas resolution a notch (never back up: no flicker)
  if (frameCost > 24 && quality < 2 && now - qualityChangedAt > 4 && params.get('adapt') !== '0') {
    quality++; qualityChangedAt = now; frameCost = 0;
    dprCap = quality === 1 ? 1.5 : 1.25;
    resize();
  }
}

// ============================================================ BOOT
resize();
makeGrass();
makeSprites();
makeFlowerSprites([...new Set(flowers.map(f => f.c))]);
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
window.TKP = { puppies, cam, camT, startFormation, endFormation, dropTreat, throwBall, LOOKS, POSES, drawPuppy, setTool, doTrick, placeBoombox, boombox, messes, showCard, get stats() { return stats; }, get frameCost() { return frameCost; }, get petted() { return pettedCount; }, get ball() { return ball; }, get formation() { return formation; } };
})();
