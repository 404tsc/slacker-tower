// Hand-drawn pets (rabbit, elephant) in the Pixel Agents pet sheet format:
// 96x96 PNG — row 0: walkDown x3 + idleDown x3 (16x32), row 1: walkUp x3 +
// idleUp x3 (16x32), row 2: walkRight x3 (32x32). Feet on the bottom row.
// usage: node scripts/slacker/draw-pets.cjs [outDir]  (default: webview-ui/public)   → <outDir>/assets/pets/<id>/{manifest.json,pet.png}
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

function canvas(w, h) {
  const d = new Array(w * h).fill(null);
  const g = {
    w, h, d,
    px(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < w && y < h && c) d[y * w + x] = c; },
    rect(x, y, rw, rh, c) { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) g.px(i, j, c); },
    ellipse(cx, cy, rx, ry, c) {
      for (let j = Math.floor(cy - ry - 1); j <= cy + ry + 1; j++)
        for (let i = Math.floor(cx - rx - 1); i <= cx + rx + 1; i++)
          if (((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2 <= 1) g.px(i, j, c);
    },
    /** add a 1px outline around every filled pixel */
    outline(o) {
      const add = [];
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (d[y * w + x]) continue;
        const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => { const X = x + a, Y = y + b; return X >= 0 && Y >= 0 && X < w && Y < h && d[Y * w + X] && d[Y * w + X] !== o; });
        if (n) add.push(y * w + x);
      }
      for (const i of add) d[i] = o;
    },
  };
  return g;
}
function sheet(frames) {
  // frames: {down:[3], idleDown:[3], up:[3], idleUp:[3], right:[3]}
  const p = new PNG({ width: 96, height: 96 });
  const blit = (g, ox, oy) => g.d.forEach((c, i) => { if (c) p.data.set([...c, 255], ((oy + Math.floor(i / g.w)) * 96 + ox + (i % g.w)) * 4); });
  frames.down.forEach((g, i) => blit(g, i * 16, 0));
  frames.idleDown.forEach((g, i) => blit(g, 48 + i * 16, 0));
  frames.up.forEach((g, i) => blit(g, i * 16, 32));
  frames.idleUp.forEach((g, i) => blit(g, 48 + i * 16, 32));
  frames.right.forEach((g, i) => blit(g, i * 32, 64));
  return PNG.sync.write(p);
}

// ── rabbit ───────────────────────────────────────────────────────────────────
const R = { O: [84, 70, 82], W: [250, 248, 244], S: [220, 214, 214], P: [244, 164, 186], E: [40, 30, 44] };
function rabbitFront({ lift = 0, earL = 0, earR = 0, back = false, blink = false, nose = 0 } = {}) {
  const g = canvas(16, 32);
  const y = -lift;
  // ears (earX = droop: shifts the tip sideways)
  for (const [x0, droop] of [[5, earL], [10, earR]]) {
    for (let k = 0; k < 8; k++) {
      const x = x0 + Math.round((droop * (7 - k)) / 7) * (x0 < 8 ? -1 : 1) * 0 + (k < 3 ? droop * (x0 < 8 ? -1 : 1) : 0);
      g.rect(x, 11 + k + y, 2, 1, R.W);
      if (!back && k > 0 && k < 7) g.px(x + (x0 < 8 ? 1 : 0), 11 + k + y, R.P);
    }
  }
  g.ellipse(8, 27 + y, 5.5, 4.2, R.W); // body
  g.ellipse(8, 21.5 + y, 4.5, 3.8, R.W); // head
  g.rect(4, 29 + y, 3, 2 + lift, R.W); // feet
  g.rect(9, 29 + y, 3, 2 + lift, R.W);
  g.rect(5, 27 + y, 6, 1, R.S); // belly shade
  if (back) {
    g.ellipse(8, 28 + y, 2, 1.6, R.S); // tail
    g.px(8, 27 + y, R.W);
  } else {
    if (blink) { g.rect(5, 21 + y, 2, 1, R.E); g.rect(9, 21 + y, 2, 1, R.E); }
    else { g.rect(5, 20 + y, 2, 2, R.E); g.rect(9, 20 + y, 2, 2, R.E); g.px(5, 20 + y, R.W); g.px(9, 20 + y, R.W); }
    g.px(7 + nose, 23 + y, R.P); g.px(8 + nose, 23 + y, R.P);
    g.px(4, 23 + y, R.P); g.px(11, 23 + y, R.P); // cheeks
  }
  g.outline(R.O);
  return g;
}
function rabbitSide(phase) {
  // phase 0: crouch, 1: mid-hop (stretched, in the air), 2: landing
  const g = canvas(32, 32);
  const lift = [0, 3, 1][phase];
  const stretch = [0, 2, 1][phase];
  const y = -lift;
  g.ellipse(14 - stretch / 2, 25 + y, 7 + stretch / 2, 4.6, R.W); // body
  g.ellipse(21 + stretch / 2, 20 + y, 4.2, 3.6, R.W); // head
  // ears lying back
  for (let k = 0; k < 8; k++) {
    g.rect(19 - Math.round(k * 0.6) + stretch / 2, 16 - k + y, 2, 1, R.W);
    if (k > 0 && k < 7) g.px(20 - Math.round(k * 0.6) + stretch / 2, 16 - k + y, R.P);
  }
  g.ellipse(7 - stretch / 2, 23 + y, 2.2, 2.2, R.W); // tail
  // legs
  if (phase === 1) {
    g.rect(5, 28 + y, 5, 2, R.W); // hind legs stretched back
    g.rect(22, 27 + y, 4, 2, R.W); // front paws reaching
  } else {
    g.rect(9, 28 + y, 6, 3 + lift, R.W); // big hind foot
    g.rect(19, 28 + y, 3, 3 + lift, R.W); // front paw
  }
  g.rect(10, 26 + y, 6, 1, R.S);
  g.rect(22 + stretch / 2, 19 + y, 2, 2, R.E); // eye
  g.px(22 + stretch / 2, 19 + y, R.W);
  g.px(25 + stretch / 2, 21 + y, R.P); // nose
  g.outline(R.O);
  return g;
}
const rabbit = {
  down: [rabbitFront(), rabbitFront({ lift: 3 }), rabbitFront({ lift: 1 })],
  idleDown: [rabbitFront(), rabbitFront({ earR: 1, nose: 0 }), rabbitFront({ blink: true })],
  up: [rabbitFront({ back: true }), rabbitFront({ back: true, lift: 3 }), rabbitFront({ back: true, lift: 1 })],
  idleUp: [rabbitFront({ back: true }), rabbitFront({ back: true, earL: 1 }), rabbitFront({ back: true, earR: 1 })],
  right: [rabbitSide(0), rabbitSide(1), rabbitSide(2)],
};

// ── elephant ─────────────────────────────────────────────────────────────────
const E = { O: [56, 58, 80], G: [156, 168, 190], L: [190, 200, 218], D: [120, 130, 154], P: [230, 176, 190], T: [246, 240, 222], K: [36, 34, 50] };
function elephantFront({ legs = 0, ear = 0, trunk = 0, back = false, blink = false } = {}) {
  const g = canvas(16, 32);
  g.ellipse(8, 25.5, 4.6, 3.8, E.G); // body
  // legs (alternate lifting)
  g.rect(4, 27 - (legs === 1 ? 1 : 0), 3, 4, E.G);
  g.rect(9, 27 - (legs === 2 ? 1 : 0), 3, 4, E.G);
  g.rect(4, 30 - (legs === 1 ? 1 : 0), 3, 1, E.L);
  g.rect(9, 30 - (legs === 2 ? 1 : 0), 3, 1, E.L);
  g.px(7, 28, E.D); g.px(8, 28, E.D); // gap between the legs
  // big round ears (flap = wider), sitting high
  const er = 2.7 + ear * 0.5;
  for (const cx of [3.2 - ear * 0.4, 12.8 + ear * 0.4]) {
    g.ellipse(cx, 16, er, 3.8, E.D);
    g.ellipse(cx, 16, er - 0.9, 2.9, back ? E.G : E.P);
  }
  g.ellipse(8, 16.5, 4.3, 4.2, E.D); // head (dark rim separates it from the ears)
  g.ellipse(8, 16.5, 3.6, 3.6, E.G);
  g.rect(6, 13, 4, 1, E.L);
  if (back) {
    g.rect(7, 26, 2, 2, E.D); // tail
    g.px(8, 28, E.K);
  } else {
    // trunk swings: -1 | 0 | 1, 2 = raised (toot!)
    const seg = (x, y) => { g.px(x - 1, y, E.D); g.rect(x, y, 2, 1, E.G); g.px(x + 2, y, E.D); };
    if (trunk === 2) {
      seg(7, 19); seg(8, 18); seg(9, 17); seg(10, 16); seg(11, 15); g.rect(12, 13, 2, 2, E.G); g.px(12, 13, E.D);
    } else {
      for (let k = 0; k < 7; k++) seg(7 + (k > 3 ? trunk : 0), 19 + k);
      g.rect(7 + trunk, 26, 2, 1, E.D);
    }
    g.px(5, 20, E.T); g.px(10, 20, E.T); // tusks
    if (blink) { g.rect(5, 16, 2, 1, E.K); g.rect(9, 16, 2, 1, E.K); }
    else { g.rect(5, 15, 2, 2, E.K); g.rect(9, 15, 2, 2, E.K); g.px(5, 15, E.L); g.px(9, 15, E.L); }
  }
  g.outline(E.O);
  return g;
}
function elephantSide(phase) {
  const g = canvas(32, 32);
  const bob = phase === 1 ? -1 : 0;
  // legs: pairs alternate
  const legs = phase === 0 ? [0, 1, 0, 1] : phase === 1 ? [0, 0, 0, 0] : [1, 0, 1, 0];
  [[5, 0], [10, 1], [17, 2], [22, 3]].forEach(([x, i]) => {
    const up = legs[i];
    g.rect(x, 26 - up + bob, 4, 5, i % 2 ? E.D : E.G);
    g.rect(x, 30 - up, 4, 1, E.L);
  });
  g.ellipse(14, 21 + bob, 10.5, 7, E.G); // body
  g.rect(7, 16 + bob, 12, 1, E.L);
  g.rect(3, 19 + bob, 1, 5, E.D); // tail
  g.px(2, 24 + bob, E.K);
  g.ellipse(24.5, 17 + bob, 5.5, 5.2, E.G); // head
  // trunk
  const sway = phase === 2 ? 1 : 0;
  for (let k = 0; k < 8; k++) g.rect(27 + Math.min(k, 3) * 0 + (k > 4 ? sway : 0) + (k < 3 ? 1 : 2), 19 + k + bob, 2, 1, E.G);
  g.rect(30 + sway, 26 + bob, 1, 1, E.D);
  g.ellipse(21, 17.5 + bob, 3.5, 5, E.D); // ear
  g.ellipse(21, 17.5 + bob, 2.4, 3.8, E.P);
  g.rect(27, 15 + bob, 2, 2, E.K); // eye
  g.px(27, 15 + bob, E.L);
  g.px(27, 22 + bob, E.T); g.px(26, 22 + bob, E.T); // tusk
  g.outline(E.O);
  return g;
}
const elephant = {
  down: [elephantFront({ legs: 1, trunk: -1 }), elephantFront({ legs: 0 }), elephantFront({ legs: 2, trunk: 1 })],
  idleDown: [elephantFront(), elephantFront({ ear: 1 }), elephantFront({ trunk: 2, blink: true })],
  up: [elephantFront({ back: true, legs: 1 }), elephantFront({ back: true }), elephantFront({ back: true, legs: 2 })],
  idleUp: [elephantFront({ back: true }), elephantFront({ back: true, ear: 1 }), elephantFront({ back: true })],
  right: [elephantSide(0), elephantSide(1), elephantSide(2)],
};

// ── panda ────────────────────────────────────────────────────────────────────
const K = { O: [40, 38, 48], W: [246, 244, 238], S: [214, 210, 206], B: [52, 50, 62], BL: [86, 84, 100], P: [240, 170, 186] };
function pandaFront({ legs = 0, back = false, blink = false, tilt = 0, sit = false } = {}) {
  const g = canvas(16, 32);
  const y = sit ? 1 : 0;
  g.ellipse(8, 25.5 + y, 5, 4.2, K.W); // body
  g.rect(3, 22 + y, 10, 3, K.B); // shoulder band / arms
  g.ellipse(3.5, 25 + y, 1.8, 2.6, K.B); // arms
  g.ellipse(12.5, 25 + y, 1.8, 2.6, K.B);
  // legs
  g.rect(4, 28 - (legs === 1 ? 1 : 0), 3, 3 + (legs === 1 ? 1 : 0), K.B);
  g.rect(9, 28 - (legs === 2 ? 1 : 0), 3, 3 + (legs === 2 ? 1 : 0), K.B);
  // ears
  g.ellipse(4 + tilt, 13.5 + y, 1.9, 1.9, K.B);
  g.ellipse(12 + tilt, 13.5 + y, 1.9, 1.9, K.B);
  g.ellipse(8 + tilt * 0.5, 17.5 + y, 5, 4.3, K.W); // head
  if (back) {
    g.rect(5 + tilt, 20 + y, 6, 1, K.S);
    g.ellipse(8, 28.5, 1.5, 1.2, K.W); // tail
  } else {
    const x = tilt * 0.5;
    g.ellipse(5.5 + x, 17.5 + y, 1.6, 1.9, K.B); // eye patches
    g.ellipse(10.5 + x, 17.5 + y, 1.6, 1.9, K.B);
    if (blink) { g.px(5 + x, 18 + y, K.W); g.px(10 + x, 18 + y, K.W); }
    else { g.px(5 + x, 17 + y, K.W); g.px(10 + x, 17 + y, K.W); }
    g.rect(7 + x, 19 + y, 2, 1, K.B); // nose
    g.px(8 + x, 20 + y, K.B);
    g.px(4 + x, 20 + y, K.P); g.px(12 + x, 20 + y, K.P); // cheeks
  }
  g.outline(K.O);
  return g;
}
function pandaSide(phase) {
  const g = canvas(32, 32);
  const bob = phase === 1 ? -1 : 0;
  const legs = phase === 0 ? [0, 1, 0, 1] : phase === 1 ? [0, 0, 0, 0] : [1, 0, 1, 0];
  [[7, 0], [11, 1], [17, 2], [21, 3]].forEach(([x, i]) => {
    g.rect(x, 26 - legs[i] + bob, 4, 5, i % 2 ? K.BL : K.B);
  });
  g.ellipse(14.5, 22 + bob, 9, 6, K.W); // body
  g.rect(17, 17 + bob, 5, 11, K.B); // shoulder band
  g.rect(16, 18 + bob, 1, 9, K.B);
  g.ellipse(5.5, 21 + bob, 1.6, 1.6, K.W); // tail
  g.ellipse(23.5, 17.5 + bob, 5, 4.5, K.W); // head
  g.ellipse(21.5, 13.5 + bob, 1.9, 1.9, K.B); // ear
  g.ellipse(25, 17 + bob, 1.8, 2, K.B); // eye patch
  g.px(25, 16 + bob, K.W);
  g.rect(28, 18 + bob, 1, 2, K.B); // nose
  g.px(23, 20 + bob, K.P);
  g.outline(K.O);
  return g;
}
const panda = {
  down: [pandaFront({ legs: 1 }), pandaFront(), pandaFront({ legs: 2 })],
  idleDown: [pandaFront({ sit: true }), pandaFront({ sit: true, tilt: 1 }), pandaFront({ sit: true, blink: true })],
  up: [pandaFront({ back: true, legs: 1 }), pandaFront({ back: true }), pandaFront({ back: true, legs: 2 })],
  idleUp: [pandaFront({ back: true, sit: true }), pandaFront({ back: true, sit: true, tilt: 1 }), pandaFront({ back: true, sit: true })],
  right: [pandaSide(0), pandaSide(1), pandaSide(2)],
};

const OUT = path.join(process.argv[2] || path.join(__dirname, '..', '..', 'webview-ui', 'public'), 'assets', 'pets');
for (const [id, name, frames] of [['bunny', '小兔子', rabbit], ['elephant', '小象', elephant], ['panda', '熊猫', panda]]) {
  const dir = path.join(OUT, id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'pet.png'), sheet(frames));
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ id, name }));
}
console.log('pets written to', OUT);
