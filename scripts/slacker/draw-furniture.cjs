// Hand-drawn pixel furniture for the 茶水间 (tea room), in the style of the
// built-in Pixel Agents assets (dark outline, 2-3 tone shading, 16px tiles).
// Writes <out>/assets/furniture/<ID>/{manifest.json, *.png}; the folder is
// loaded through config.externalAssetDirectories.
// usage: node scripts/slacker/draw-furniture.cjs [outDir]  (default: webview-ui/public)
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const OUT = path.join(process.argv[2] || path.join(__dirname, '..', '..', 'webview-ui', 'public'), 'assets', 'furniture');

// ── palette ──────────────────────────────────────────────────────────────────
const P = {
  O: [46, 30, 38], // outline
  woodL: [214, 160, 104],
  wood: [176, 118, 72],
  woodD: [124, 78, 48],
  woodDD: [90, 54, 36],
  top: [236, 218, 182], // counter top
  topD: [206, 184, 144],
  tile: [232, 228, 214], // backsplash
  grout: [196, 190, 172],
  fridgeL: [214, 236, 244],
  fridge: [160, 204, 222],
  fridgeD: [112, 158, 184],
  steelL: [222, 226, 232],
  steel: [168, 174, 184],
  steelD: [112, 116, 128],
  black: [58, 56, 66],
  blackL: [92, 90, 104],
  cream: [240, 234, 220],
  creamD: [206, 198, 180],
  glow: [255, 176, 72],
  glowD: [214, 110, 48],
  glass: [176, 222, 240],
  glassL: [232, 248, 255],
  glassD: [122, 176, 206],
  red: [206, 72, 64],
  redD: [150, 46, 46],
  yellow: [244, 206, 92],
  green: [112, 176, 92],
  greenD: [70, 128, 64],
  blue: [92, 140, 206],
  chairL: [222, 150, 92],
  chair: [190, 112, 62],
  chairD: [138, 74, 42],
  shade: [250, 234, 176],
  shadeD: [226, 198, 128],
  water: [150, 206, 240],
  waterL: [214, 240, 255],
  orange: [240, 150, 60],
};

// ── tiny raster ──────────────────────────────────────────────────────────────
function img(w, h) {
  const d = new Array(w * h).fill(null);
  const g = {
    w,
    h,
    px(x, y, c) {
      if (x >= 0 && y >= 0 && x < w && y < h && c) d[y * w + x] = c;
    },
    rect(x, y, rw, rh, c) {
      for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) g.px(i, j, c);
    },
    /** filled rect with 1px outline */
    box(x, y, rw, rh, c, o = P.O) {
      g.rect(x, y, rw, rh, o);
      g.rect(x + 1, y + 1, rw - 2, rh - 2, c);
    },
    hl(x, y, len, c) {
      g.rect(x, y, len, 1, c);
    },
    vl(x, y, len, c) {
      g.rect(x, y, 1, len, c);
    },
    ellipse(cx, cy, rx, ry, c, o) {
      for (let j = Math.floor(cy - ry - 1); j <= cy + ry + 1; j++)
        for (let i = Math.floor(cx - rx - 1); i <= cx + rx + 1; i++) {
          const v = ((i + 0.5 - cx) / rx) ** 2 + ((j + 0.5 - cy) / ry) ** 2;
          if (v <= 1) {
            const vi = ((i + 0.5 - cx) / (rx - 1)) ** 2 + ((j + 0.5 - cy) / (ry - 1)) ** 2;
            g.px(i, j, o && vi > 1 ? o : c);
          }
        }
    },
    /** mirror horizontally (returns new image) */
    flip() {
      const n = img(w, h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) n.px(w - 1 - x, y, d[y * w + x]);
      return n;
    },
    get(x, y) {
      return d[y * w + x];
    },
    png() {
      const p = new PNG({ width: w, height: h });
      d.forEach((c, i) => p.data.set(c ? [...c, 255] : [0, 0, 0, 0], i * 4));
      return PNG.sync.write(p);
    },
  };
  return g;
}

// ── shared kitchen pieces ────────────────────────────────────────────────────
/** Tiled backsplash band on the wall (y 18..29). */
function backsplash(g, x0 = 0, x1 = g.w) {
  g.rect(x0, 18, x1 - x0, 12, P.tile);
  for (let y = 18; y < 30; y += 4) g.hl(x0, y, x1 - x0, P.grout);
  for (let y = 18; y < 30; y += 4)
    for (let x = x0 + ((y / 4) % 2 ? 2 : 6); x < x1; x += 8) g.vl(x, y, 4, P.grout);
}
/** Counter: top surface y 29..33, wooden cabinet front y 34..47. */
function counter(g, x0 = 0, x1 = g.w) {
  const w = x1 - x0;
  g.box(x0, 29, w, 6, P.top);
  g.hl(x0 + 1, 30, w - 2, [246, 236, 210]);
  g.hl(x0 + 1, 33, w - 2, P.topD);
  g.box(x0, 34, w, 14, P.wood);
  g.hl(x0 + 1, 46, w - 2, P.woodD); // kick plate
  g.hl(x0 + 1, 45, w - 2, P.woodD);
}
function cabinetDoor(g, x, w) {
  g.rect(x, 36, w, 8, P.woodD);
  g.rect(x + 1, 37, w - 2, 6, P.woodL);
  g.rect(x + 2, 38, w - 4, 4, P.wood);
}

// ── sprites ──────────────────────────────────────────────────────────────────
function fridge() {
  const g = img(32, 48);
  g.box(3, 2, 26, 45, P.fridge);
  g.rect(4, 3, 24, 3, P.fridgeL); // top face
  g.hl(4, 6, 24, P.fridgeD);
  g.rect(4, 7, 3, 39, P.fridgeL); // left highlight
  g.rect(25, 7, 3, 39, P.fridgeD); // right shade
  g.hl(3, 18, 26, P.O); // freezer split
  g.hl(4, 19, 24, P.fridgeL);
  g.rect(4, 43, 24, 3, P.steelD); // kick plate
  // handles
  g.rect(21, 9, 2, 7, P.steelD);
  g.vl(21, 9, 7, P.steelL);
  g.rect(21, 22, 2, 12, P.steelD);
  g.vl(21, 22, 12, P.steelL);
  // magnets + note
  g.box(9, 24, 6, 7, P.cream);
  g.hl(10, 26, 4, P.creamD);
  g.hl(10, 28, 3, P.creamD);
  g.px(11, 24, P.red);
  g.px(15, 12, P.yellow);
  g.px(9, 10, P.green);
  return g;
}

function stove() {
  const g = img(32, 48);
  backsplash(g);
  // hood + chimney
  g.box(12, 0, 8, 6, P.steel);
  g.box(4, 5, 24, 7, P.steel);
  g.hl(5, 6, 22, P.steelL);
  g.hl(5, 10, 22, P.steelD);
  g.hl(8, 12, 16, P.O);
  g.rect(9, 12, 14, 1, [255, 240, 190]);
  // body
  g.box(2, 28, 28, 20, P.cream);
  g.box(2, 28, 28, 7, P.black); // cooktop
  g.hl(3, 29, 26, P.blackL);
  for (const [x, y] of [
    [9, 31],
    [22, 31],
  ]) {
    g.ellipse(x, y + 0.5, 4, 2.2, P.black, P.steelD);
    g.px(x - 1, y, P.glowD);
    g.px(x, y, P.glowD);
  }
  // knobs
  for (const x of [6, 10, 14, 18, 22, 26]) g.px(x, 36, P.black);
  g.hl(3, 37, 26, P.creamD);
  // oven door
  g.box(4, 38, 24, 8, P.creamD);
  g.box(7, 40, 18, 5, P.glowD);
  g.rect(8, 41, 16, 2, P.glow);
  g.hl(8, 39, 16, P.steelD); // handle
  g.hl(3, 46, 26, P.creamD);
  return g;
}

function coffeeCounter() {
  const g = img(16, 48);
  backsplash(g);
  // wall shelf with mugs
  g.box(0, 9, 16, 3, P.woodL);
  g.box(2, 5, 4, 4, P.red);
  g.box(7, 5, 4, 4, P.cream);
  g.box(12, 6, 3, 3, P.blue);
  counter(g);
  cabinetDoor(g, 2, 12);
  g.px(12, 40, P.O);
  // espresso machine on the counter
  g.box(2, 16, 12, 15, P.black);
  g.hl(3, 17, 10, P.blackL);
  g.rect(4, 19, 8, 2, P.steel); // display
  g.px(5, 19, P.green);
  g.rect(6, 22, 4, 2, P.steelD); // group head
  g.box(6, 25, 4, 4, P.cream); // cup
  g.px(10, 26, P.cream);
  g.px(7, 24, [120, 74, 46]);
  return g;
}

function sinkCounter() {
  const g = img(48, 48);
  backsplash(g);
  // window on the wall
  g.box(9, 0, 30, 17, P.woodD);
  g.rect(11, 2, 26, 13, P.glass);
  g.rect(11, 2, 26, 3, P.glassL);
  g.vl(24, 2, 13, P.woodD);
  g.hl(11, 8, 26, P.woodD);
  g.px(13, 6, P.glassL);
  g.px(14, 5, P.glassL);
  g.px(27, 11, P.glassL);
  g.px(28, 10, P.glassL);
  g.box(7, 16, 34, 3, P.woodL); // sill
  g.px(12, 15, P.green); // tiny plant on sill
  g.px(13, 14, P.green);
  g.px(13, 15, P.greenD);
  g.px(14, 15, P.green);
  counter(g);
  // sink basin + faucet
  g.box(16, 30, 18, 4, P.steelD);
  g.hl(17, 31, 16, P.steel);
  g.rect(24, 22, 2, 9, P.steel);
  g.vl(24, 22, 9, P.steelL);
  g.rect(24, 22, 6, 2, P.steel);
  g.px(29, 24, P.steelD);
  g.px(21, 27, P.red);
  g.px(28, 27, P.blue);
  // dish rack corner
  g.box(37, 25, 9, 5, P.steel);
  g.rect(39, 21, 1, 5, P.cream);
  g.rect(41, 21, 1, 5, P.cream);
  g.rect(43, 22, 1, 4, P.blue);
  // cabinet doors
  cabinetDoor(g, 2, 13);
  cabinetDoor(g, 17, 14);
  cabinetDoor(g, 33, 13);
  for (const x of [13, 18, 29, 35]) g.px(x, 40, P.O);
  return g;
}

function kitchenShelf() {
  const g = img(32, 48);
  backsplash(g);
  // open wall shelf with jars
  g.box(1, 11, 30, 3, P.woodL);
  g.vl(3, 14, 2, P.woodD);
  g.vl(28, 14, 2, P.woodD);
  const jars = [
    [3, P.yellow],
    [9, P.red],
    [15, P.green],
    [21, P.orange],
  ];
  for (const [x, c] of jars) {
    g.box(x, 5, 5, 6, P.glassL);
    g.rect(x + 1, 7, 3, 3, c);
    g.hl(x, 4, 5, P.woodD);
  }
  g.box(26, 6, 4, 5, P.cream); // small plant pot
  g.rect(25, 2, 6, 4, P.green);
  g.px(27, 1, P.greenD);
  counter(g);
  // drawers
  g.rect(2, 36, 28, 4, P.woodD);
  g.rect(3, 37, 26, 2, P.woodL);
  g.rect(2, 41, 28, 4, P.woodD);
  g.rect(3, 42, 26, 2, P.woodL);
  g.hl(13, 38, 6, P.O);
  g.hl(13, 43, 6, P.O);
  // fruit bowl + cutting board on the counter
  g.box(3, 25, 11, 5, P.woodL);
  g.ellipse(23, 27, 6, 3, P.cream, P.O);
  g.px(20, 25, P.orange);
  g.px(21, 25, P.orange);
  g.px(23, 24, P.red);
  g.px(24, 24, P.red);
  g.px(25, 25, P.green);
  return g;
}

function diningTable() {
  const g = img(48, 32);
  g.box(1, 5, 46, 15, P.woodL); // top
  g.hl(2, 6, 44, [232, 186, 132]);
  for (let x = 6; x < 46; x += 10) g.vl(x, 8, 10, [200, 146, 94]); // planks
  g.box(1, 19, 46, 5, P.wood); // apron
  g.hl(2, 22, 44, P.woodD);
  for (const x of [3, 42]) {
    g.box(x, 23, 3, 9, P.woodD);
  }
  // plate + cup + small vase
  g.ellipse(14, 12, 4, 2.5, P.cream, P.creamD);
  g.px(13, 12, P.orange);
  g.px(14, 11, P.red);
  g.box(32, 9, 4, 4, P.cream);
  g.px(33, 10, [120, 74, 46]);
  g.box(23, 6, 3, 5, P.glass);
  g.px(24, 4, P.red);
  g.px(23, 5, P.yellow);
  g.px(25, 5, P.red);
  return g;
}

function floorLamp() {
  const g = img(16, 32);
  g.ellipse(8, 30, 4, 1.6, P.black, P.O);
  g.rect(7, 10, 2, 20, P.steelD);
  g.vl(7, 10, 20, P.steel);
  // shade (trapezoid)
  for (let y = 1; y <= 10; y++) {
    const half = 3 + Math.floor((y - 1) / 2);
    g.hl(8 - half, y, half * 2, y === 1 || y === 10 ? P.O : P.shade);
    g.px(8 - half, y, P.O);
    g.px(8 + half - 1, y, P.O);
    if (y > 1 && y < 10) g.px(8 + half - 2, y, P.shadeD);
  }
  g.hl(5, 11, 6, [255, 244, 200]);
  return g;
}

function sideTableLamp() {
  const g = img(16, 32);
  // lamp
  for (let y = 2; y <= 10; y++) {
    const half = 2 + Math.floor((y - 2) / 2);
    g.hl(8 - half, y, half * 2, y === 2 || y === 10 ? P.O : P.shade);
    g.px(8 - half, y, P.O);
    g.px(8 + half - 1, y, P.O);
  }
  g.rect(7, 11, 2, 4, P.woodD);
  g.box(5, 14, 6, 3, P.wood);
  // table
  g.box(1, 16, 14, 5, P.woodL);
  g.hl(2, 17, 12, [232, 186, 132]);
  g.box(2, 20, 12, 11, P.wood);
  g.rect(4, 22, 8, 3, P.woodD);
  g.px(8, 23, P.yellow);
  g.vl(2, 30, 2, P.O);
  g.vl(13, 30, 2, P.O);
  return g;
}

// Armchair, chunky upholstered (orange-brown like the sketch)
function armchairFront() {
  const g = img(16, 16);
  g.box(2, 0, 12, 9, P.chair); // back
  g.hl(3, 1, 10, P.chairL);
  g.box(0, 5, 4, 10, P.chair); // arms
  g.box(12, 5, 4, 10, P.chair);
  g.hl(1, 6, 2, P.chairL);
  g.hl(13, 6, 2, P.chairL);
  g.box(3, 8, 10, 5, P.chairL); // cushion
  g.hl(4, 11, 8, P.chair);
  g.box(2, 12, 12, 3, P.chairD); // base
  g.px(1, 15, P.O);
  g.px(14, 15, P.O);
  return g;
}
function armchairBack() {
  const g = img(16, 16);
  g.box(0, 3, 4, 10, P.chair);
  g.box(12, 3, 4, 10, P.chair);
  g.box(2, 1, 12, 13, P.chair);
  g.hl(3, 2, 10, P.chairL);
  g.rect(3, 9, 10, 4, P.chairD);
  g.hl(3, 8, 10, P.chair);
  g.px(1, 13, P.O);
  g.px(14, 13, P.O);
  g.hl(2, 14, 12, P.O);
  return g;
}
function armchairSide() {
  // facing right
  const g = img(16, 16);
  g.box(1, 0, 5, 14, P.chair); // back
  g.vl(2, 1, 12, P.chairL);
  g.box(4, 7, 10, 5, P.chairL); // seat cushion
  g.box(3, 5, 12, 4, P.chair); // near arm on top
  g.hl(4, 6, 10, P.chairL);
  g.box(3, 11, 12, 4, P.chairD); // base
  g.px(4, 15, P.O);
  g.px(13, 15, P.O);
  return g;
}

function loveseatFront() {
  const g = img(32, 16);
  g.box(2, 0, 28, 9, P.chair);
  g.hl(3, 1, 26, P.chairL);
  g.vl(16, 2, 6, P.chairD);
  g.box(0, 5, 4, 10, P.chair);
  g.box(28, 5, 4, 10, P.chair);
  g.hl(1, 6, 2, P.chairL);
  g.hl(29, 6, 2, P.chairL);
  g.box(3, 8, 13, 5, P.chairL);
  g.box(16, 8, 13, 5, P.chairL);
  g.box(2, 12, 28, 3, P.chairD);
  g.px(1, 15, P.O);
  g.px(30, 15, P.O);
  return g;
}
function loveseatBack() {
  const g = img(32, 16);
  g.box(0, 3, 4, 10, P.chair);
  g.box(28, 3, 4, 10, P.chair);
  g.box(2, 1, 28, 13, P.chair);
  g.hl(3, 2, 26, P.chairL);
  g.rect(3, 9, 26, 4, P.chairD);
  g.hl(2, 14, 28, P.O);
  return g;
}
function loveseatSide() {
  // facing right, 16x32
  const g = img(16, 32);
  g.box(1, 0, 5, 30, P.chair);
  g.vl(2, 1, 28, P.chairL);
  g.box(4, 4, 10, 12, P.chairL);
  g.box(4, 15, 10, 12, P.chairL);
  g.box(3, 0, 12, 5, P.chair); // far arm
  g.hl(4, 1, 10, P.chairL);
  g.box(3, 25, 12, 5, P.chair); // near arm
  g.hl(4, 26, 10, P.chairL);
  g.box(3, 29, 12, 3, P.chairD);
  return g;
}

function loungeTable() {
  const g = img(32, 16);
  g.box(1, 5, 30, 7, P.woodL);
  g.hl(2, 6, 28, [232, 186, 132]);
  g.box(1, 11, 30, 2, P.wood);
  g.box(2, 12, 3, 4, P.woodD);
  g.box(27, 12, 3, 4, P.woodD);
  // teapot + two cups
  g.ellipse(16, 4.5, 4, 3.5, P.cream, P.O);
  g.px(16, 0, P.O);
  g.hl(14, 4, 4, P.creamD);
  g.px(20, 3, P.O);
  g.px(21, 2, P.O);
  g.box(6, 5, 4, 4, P.cream);
  g.box(23, 5, 4, 4, P.cream);
  g.px(7, 6, [150, 96, 50]);
  g.px(24, 6, [150, 96, 50]);
  return g;
}

function roundTable() {
  const g = img(16, 16);
  g.ellipse(8, 9.5, 2.5, 1, P.black); // foot shadow
  g.rect(7, 7, 2, 7, P.steelD);
  g.ellipse(8, 14, 4, 1.5, P.steelD, P.O);
  g.ellipse(8, 5, 7, 4, P.glass, P.O);
  g.hl(4, 3, 4, P.glassL);
  g.px(10, 6, P.glassD);
  g.box(9, 2, 3, 3, P.cream); // cup
  return g;
}

function stool() {
  const g = img(16, 16);
  g.vl(4, 8, 8, P.woodDD);
  g.vl(11, 8, 8, P.woodDD);
  g.vl(6, 9, 6, P.woodD);
  g.vl(9, 9, 6, P.woodD);
  g.hl(5, 12, 6, P.woodD);
  g.ellipse(8, 6, 5, 3, P.chairL, P.O);
  g.hl(5, 5, 4, [240, 186, 130]);
  g.hl(4, 8, 8, P.chairD);
  return g;
}

function waterCooler() {
  const g = img(16, 32);
  // bottle
  g.box(4, 0, 8, 11, P.water);
  g.rect(5, 1, 2, 9, P.waterL);
  g.hl(5, 4, 6, P.glassD);
  g.box(6, 10, 4, 2, P.glassD);
  // body
  g.box(2, 11, 12, 20, P.cream);
  g.rect(3, 12, 2, 18, [252, 250, 244]);
  g.rect(11, 12, 2, 18, P.creamD);
  g.box(4, 15, 8, 6, P.creamD); // tap recess
  g.rect(5, 16, 2, 2, P.blue);
  g.rect(9, 16, 2, 2, P.red);
  g.hl(5, 20, 6, P.steelD); // drip tray
  g.hl(3, 29, 10, P.creamD);
  return g;
}

// ── manifests ────────────────────────────────────────────────────────────────
const items = [];
function single(id, name, category, g, fpW, fpH, bg = 0, extra = {}) {
  items.push({
    id,
    files: { [`${id}.png`]: g },
    manifest: {
      id,
      name,
      category,
      type: 'asset',
      canPlaceOnWalls: false,
      canPlaceOnSurfaces: false,
      backgroundTiles: bg,
      width: g.w,
      height: g.h,
      footprintW: fpW,
      footprintH: fpH,
      ...extra,
    },
  });
}
function rotation(id, name, category, front, back, side, bg = 0) {
  const fp = (g) => ({ width: g.w, height: g.h, footprintW: g.w / 16, footprintH: g.h / 16 });
  items.push({
    id,
    files: { [`${id}_FRONT.png`]: front, [`${id}_BACK.png`]: back, [`${id}_SIDE.png`]: side },
    manifest: {
      id,
      name,
      category,
      type: 'group',
      groupType: 'rotation',
      rotationScheme: '3-way-mirror',
      canPlaceOnWalls: false,
      canPlaceOnSurfaces: false,
      backgroundTiles: bg,
      members: [
        { type: 'asset', id: `${id}_FRONT`, file: `${id}_FRONT.png`, ...fp(front), orientation: 'front' },
        { type: 'asset', id: `${id}_BACK`, file: `${id}_BACK.png`, ...fp(back), orientation: 'back' },
        {
          type: 'asset',
          id: `${id}_SIDE`,
          file: `${id}_SIDE.png`,
          ...fp(side),
          orientation: 'side',
          mirrorSide: true,
        },
      ],
    },
  });
}

single('FRIDGE', 'Fridge', 'misc', fridge(), 2, 3, 2);
single('STOVE', 'Stove', 'misc', stove(), 2, 3, 2);
single('COFFEE_COUNTER', 'Coffee Counter', 'misc', coffeeCounter(), 1, 3, 2);
single('SINK_COUNTER', 'Sink Counter', 'misc', sinkCounter(), 3, 3, 2);
single('KITCHEN_SHELF', 'Kitchen Shelf', 'misc', kitchenShelf(), 2, 3, 2);
single('DINING_TABLE', 'Dining Table', 'desks', diningTable(), 3, 2, 1);
single('FLOOR_LAMP', 'Floor Lamp', 'decor', floorLamp(), 1, 2, 1);
single('SIDE_TABLE_LAMP', 'Side Table Lamp', 'decor', sideTableLamp(), 1, 2, 1);
single('LOUNGE_TABLE', 'Lounge Table', 'desks', loungeTable(), 2, 1, 0);
single('ROUND_TABLE', 'Round Table', 'desks', roundTable(), 1, 1, 0);
single('STOOL', 'Stool', 'chairs', stool(), 1, 1, 0);
single('WATER_COOLER', 'Water Cooler', 'misc', waterCooler(), 1, 2, 1);
rotation('ARMCHAIR', 'Armchair', 'chairs', armchairFront(), armchairBack(), armchairSide());
rotation('LOVESEAT', 'Loveseat', 'chairs', loveseatFront(), loveseatBack(), loveseatSide());

// ── round & playful pieces (2026-11-10, "活泼一点") ─────────────────────────
/** Oval rug: border, field, inner ring, medallion. Lies flat (all rows background). */
function rug(w, h, edge, border, field, ring, center) {
  const g = img(w, h);
  const cx = w / 2, cy = h / 2;
  g.ellipse(cx, cy, w / 2, h / 2, edge);
  g.ellipse(cx, cy, w / 2 - 1, h / 2 - 1, border);
  g.ellipse(cx, cy, w / 2 - 4, h / 2 - 4, field);
  g.ellipse(cx, cy, w / 2 - 9, h / 2 - 8, ring);
  g.ellipse(cx, cy, w / 2 - 11, h / 2 - 10, field);
  if (w >= 64) {
    g.ellipse(cx, cy, w / 2 - 22, h / 2 - 18, center);
    g.ellipse(cx, cy, w / 2 - 25, h / 2 - 21, field);
  }
  // dotted pattern on the border
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 14) {
    g.px(Math.round(cx + Math.cos(a) * (w / 2 - 2.5) - 0.5), Math.round(cy + Math.sin(a) * (h / 2 - 2.5) - 0.5), ring);
  }
  return g;
}

function roundMeetingTable() {
  const g = img(48, 48);
  g.rect(21, 34, 6, 10, P.woodDD); // pedestal
  g.ellipse(24, 44, 9, 3, P.woodD, P.O);
  g.ellipse(24, 22, 23.5, 17, P.wood, P.O); // edge
  g.ellipse(24, 20, 23.5, 16, P.woodL, P.O); // top
  g.ellipse(24, 19, 19, 12, [226, 176, 120]);
  g.ellipse(24, 20, 9, 5, P.woodL);
  // laptop, papers, cups
  g.box(9, 13, 9, 6, P.steelD);
  g.rect(10, 14, 7, 4, [140, 200, 230]);
  g.box(30, 22, 7, 6, P.cream);
  g.hl(31, 24, 5, P.creamD);
  g.box(32, 11, 4, 4, P.cream);
  g.px(33, 12, [120, 74, 46]);
  g.box(14, 24, 4, 4, P.red);
  g.box(22, 15, 4, 6, P.glass); // water jug
  g.hl(23, 16, 2, P.glassL);
  return g;
}

function curvedSofa() {
  // crescent sofa, 4x2 tiles, opening towards the viewer
  const g = img(64, 32);
  const cx = 32, cy = 30;
  const inE = (x, y, rx, ry) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
  const C = { L: [240, 140, 116], M: [214, 104, 84], D: [158, 66, 58] };
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 64; x++) {
      if (!inE(x, y, 32, 30)) continue;
      if (inE(x, y, 12, 9)) continue; // the opening
      let c;
      if (!inE(x, y, 31, 29)) c = P.O;
      else if (!inE(x, y, 25, 22)) c = inE(x, y, 29.5, 27.5) ? C.M : C.L; // back
      else if (!inE(x, y, 24, 21)) c = P.O; // back/seat seam
      else if (!inE(x, y, 13, 10)) c = inE(x, y, 14.5, 11.5) ? C.M : C.L; // cushions
      else c = P.O;
      g.px(x, y, c);
    }
  // cushion seams + base shadow
  for (const [x0, y0, x1, y1] of [[20, 10, 16, 6], [44, 10, 48, 6]]) {
    for (let t = 0; t <= 4; t++) g.px(Math.round(x0 + ((x1 - x0) * t) / 4), Math.round(y0 + ((y1 - y0) * t) / 4), C.M);
  }
  g.rect(0, 30, 21, 2, C.D);
  g.rect(43, 30, 21, 2, C.D);
  g.hl(0, 31, 21, P.O);
  g.hl(43, 31, 21, P.O);
  return g;
}

function roundCoffeeTable() {
  const g = img(32, 32);
  g.ellipse(16, 27, 6, 2.5, P.woodDD, P.O);
  g.rect(14, 18, 4, 9, P.woodD);
  g.ellipse(16, 14, 15.5, 10, P.wood, P.O);
  g.ellipse(16, 12.5, 15.5, 9.5, P.woodL, P.O);
  g.ellipse(16, 12, 12, 6.5, [226, 176, 120]);
  // books + plant
  g.box(6, 9, 8, 4, P.blue);
  g.box(7, 7, 7, 3, P.yellow);
  g.ellipse(21, 11, 4, 3, P.green, P.greenD);
  g.box(19, 12, 5, 4, P.cream);
  return g;
}

function beanbag(main, light, dark) {
  const g = img(16, 16);
  g.ellipse(8, 10, 8, 6, main, P.O);
  g.ellipse(8, 6, 6, 5, main, P.O);
  g.ellipse(8, 10, 6, 4, light);
  g.ellipse(8, 6, 4, 3, light);
  g.hl(3, 14, 10, dark);
  g.px(5, 9, dark);
  g.px(11, 9, dark);
  return g;
}

function easel() {
  const g = img(16, 32);
  // legs
  for (let y = 4; y < 32; y++) {
    const t = (y - 4) / 27;
    g.px(Math.round(7 - t * 5), y, P.woodD);
    g.px(Math.round(8 + t * 5), y, P.woodD);
  }
  g.vl(8, 18, 12, P.woodDD);
  // canvas with a little landscape
  g.box(1, 2, 14, 15, P.cream);
  g.rect(2, 3, 12, 6, [150, 206, 236]);
  g.ellipse(11, 5, 2, 2, P.yellow);
  g.rect(2, 9, 12, 7, P.green);
  g.ellipse(5, 9.5, 4, 2.5, P.greenD);
  g.px(9, 12, P.red);
  g.px(7, 13, P.red);
  g.box(0, 16, 16, 2, P.woodL); // ledge
  return g;
}

single('RUG_ROUND_TEAL', 'Round Rug Teal', 'decor',
  rug(112, 80, [40, 70, 80], [70, 130, 140], [100, 168, 172], [232, 214, 170], [230, 150, 90]), 7, 5, 5);
single('RUG_ROUND_CREAM', 'Round Rug Cream', 'decor',
  rug(96, 80, [150, 110, 70], [214, 168, 96], [240, 220, 176], [214, 110, 84], [214, 168, 96]), 6, 5, 5);
single('RUG_ROUND_PINK', 'Round Rug Pink', 'decor',
  rug(48, 48, [150, 80, 110], [226, 140, 170], [248, 214, 222], [240, 190, 90], [226, 140, 170]), 3, 3, 3);
single('ROUND_MEETING_TABLE', 'Round Meeting Table', 'desks', roundMeetingTable(), 3, 3, 0);
single('CURVED_SOFA', 'Curved Sofa', 'chairs', curvedSofa(), 4, 2, 1);
single('ROUND_COFFEE_TABLE', 'Round Coffee Table', 'desks', roundCoffeeTable(), 2, 2, 0);
single('BEANBAG_YELLOW', 'Beanbag Yellow', 'chairs', beanbag([232, 180, 60], [250, 214, 110], [180, 130, 40]), 1, 1, 0);
single('BEANBAG_TEAL', 'Beanbag Teal', 'chairs', beanbag([60, 160, 170], [110, 206, 206], [40, 110, 120]), 1, 1, 0);
single('EASEL', 'Easel', 'decor', easel(), 1, 2, 1);

// ── bedroom (2026-11-10, 卧室) ───────────────────────────────────────────────
/**
 * Single bed, 2x3 tiles, headboard at the top. The blanket starts at y=20 —
 * a sleeping character's head is drawn on the pillow with its chin on that
 * line (renderer: SLEEP_* constants), so it looks tucked in.
 */
function bed(main, light, dark) {
  const g = img(32, 48);
  // legs + frame
  g.rect(2, 44, 3, 4, P.woodDD);
  g.rect(27, 44, 3, 4, P.woodDD);
  g.box(1, 8, 30, 38, P.woodD);
  // mattress / sheet
  g.box(2, 9, 28, 35, P.cream);
  g.hl(3, 42, 26, P.creamD);
  // pillow
  g.box(6, 10, 20, 9, [252, 250, 244]);
  g.hl(7, 17, 18, P.creamD);
  g.px(7, 11, P.creamD);
  g.px(24, 11, P.creamD);
  // blanket with a turned-down fold
  g.box(2, 20, 28, 25, main);
  g.rect(3, 21, 26, 3, [250, 246, 236]); // fold (sheet showing)
  g.hl(3, 24, 26, P.creamD);
  g.rect(3, 25, 26, 18, main);
  g.rect(3, 25, 3, 18, light); // side highlight
  g.rect(26, 25, 3, 18, dark); // side shade
  g.hl(3, 43, 26, dark);
  // little pattern
  for (let y = 29; y < 42; y += 5) for (let x = 9; x < 24; x += 6) g.px(x + ((y / 5) % 2 ? 3 : 0), y, light);
  // headboard
  g.box(0, 0, 32, 12, P.wood);
  g.rect(1, 1, 30, 2, P.woodL);
  g.rect(4, 4, 24, 6, P.woodD);
  g.rect(5, 5, 22, 4, P.wood);
  g.hl(1, 10, 30, P.woodD);
  return g;
}

function wardrobe() {
  // 2 wide, 3 tall, stands against the wall (2 background rows)
  const g = img(32, 48);
  g.box(1, 4, 30, 43, P.wood);
  g.rect(2, 5, 28, 2, P.woodL); // top moulding
  g.hl(2, 7, 28, P.woodD);
  g.box(3, 9, 13, 34, P.woodL); // doors
  g.box(16, 9, 13, 34, P.woodL);
  g.rect(5, 11, 9, 13, P.wood);
  g.rect(18, 11, 9, 13, P.wood);
  g.rect(5, 27, 9, 13, P.wood);
  g.rect(18, 27, 9, 13, P.wood);
  g.rect(14, 24, 1, 4, P.steel); // handles
  g.rect(17, 24, 1, 4, P.steel);
  g.rect(2, 44, 28, 2, P.woodD);
  g.rect(2, 46, 3, 2, P.woodDD);
  g.rect(27, 46, 3, 2, P.woodDD);
  return g;
}

function nightstand() {
  // 1x2: little cabinet with an alarm clock (top row is background)
  const g = img(16, 32);
  g.box(1, 16, 14, 15, P.wood);
  g.rect(2, 17, 12, 2, P.woodL);
  g.box(3, 21, 10, 4, P.woodL);
  g.px(8, 22, P.woodDD);
  g.box(3, 25, 10, 4, P.woodL);
  g.px(8, 26, P.woodDD);
  g.rect(2, 31, 2, 1, P.woodDD);
  g.rect(12, 31, 2, 1, P.woodDD);
  // alarm clock
  g.ellipse(8, 12, 4, 4, P.cream, P.O);
  g.px(8, 11, P.O);
  g.px(8, 12, P.O);
  g.px(9, 12, P.O);
  g.px(5, 8, P.red);
  g.px(11, 8, P.red);
  g.rect(6, 15, 1, 1, P.O);
  g.rect(10, 15, 1, 1, P.O);
  return g;
}

single('BED_BLUE', 'Bed Blue', 'misc', bed([108, 150, 214], [150, 186, 236], [74, 108, 168]), 2, 3, 0);
single('BED_PINK', 'Bed Pink', 'misc', bed([226, 140, 160], [244, 184, 196], [176, 96, 120]), 2, 3, 0);
single('BED_GREEN', 'Bed Green', 'misc', bed([120, 176, 120], [168, 210, 156], [80, 128, 84]), 2, 3, 0);
single('BED_YELLOW', 'Bed Yellow', 'misc', bed([232, 190, 92], [250, 220, 140], [184, 140, 60]), 2, 3, 0);
single('WARDROBE', 'Wardrobe', 'misc', wardrobe(), 2, 3, 2);
single('NIGHTSTAND', 'Nightstand', 'misc', nightstand(), 1, 2, 1);
single('RUG_ROUND_LAVENDER', 'Round Rug Lavender', 'decor',
  rug(64, 48, [100, 80, 130], [170, 150, 210], [222, 212, 240], [240, 200, 120], [170, 150, 210]), 4, 3, 3);

// ── building: elevator, gym, pool (2026-11-13, 三层楼) ──────────────────────
/** Elevator in the wall: 2x3, doors on the bottom tile, floor display above. */
function elevator() {
  const g = img(32, 48);
  // steel frame set into the wall
  g.box(0, 2, 32, 46, P.steelD);
  g.rect(1, 3, 30, 2, P.steel);
  // floor indicator
  g.box(9, 5, 14, 7, P.black);
  g.px(12, 8, P.glow);
  g.px(13, 7, P.glow);
  g.px(13, 8, P.glow);
  g.px(13, 9, P.glow);
  g.px(17, 7, P.green); // ▲
  g.hl(16, 8, 3, P.green);
  g.px(17, 10, P.redD); // ▼
  // doors
  g.box(3, 13, 26, 35, P.steel);
  g.rect(4, 14, 12, 33, P.steelL);
  g.rect(16, 14, 12, 33, P.steelL);
  g.vl(15, 14, 33, P.steelD);
  g.vl(16, 14, 33, P.O);
  g.rect(5, 15, 2, 31, [240, 244, 248]); // sheen
  g.rect(18, 15, 2, 31, [240, 244, 248]);
  g.hl(4, 46, 24, P.steelD); // sill
  // call buttons on the frame
  g.box(29, 24, 3, 7, P.black);
  g.px(30, 26, P.glow);
  g.px(30, 28, P.cream);
  return g;
}

// ── gym set redrawn after the user's reference (2026-11-13): blue treadmill
// with a console, grey-blue frames, black plates, orange pads, navy outlines ──
const GY = {
  O: [36, 38, 74], // navy outline
  blue: [58, 120, 216],
  blueL: [110, 170, 242],
  blueD: [36, 82, 166],
  belt: [42, 44, 64],
  beltL: [70, 72, 96],
  frame: [150, 160, 198],
  frameL: [196, 204, 230],
  frameD: [98, 106, 150],
  orange: [242, 150, 58],
  orangeL: [255, 196, 118],
  orangeD: [204, 104, 34],
  plate: [30, 30, 44],
  plateL: [78, 78, 100],
  silver: [214, 218, 230],
  screen: [26, 44, 60],
  screenG: [110, 222, 150],
  shadow: [196, 184, 226],
};

function treadmill() {
  // 2 wide x 3 tall; the console row stands against the wall (1 background row).
  // A runner's feet land on the belt at TREADMILL_FEET_Y (breaks.ts) = 38.
  const g = img(32, 48);
  // soft lavender shadow, like the reference
  g.rect(3, 45, 28, 3, GY.shadow);
  // console
  g.box(3, 1, 26, 12, GY.blue, GY.O);
  g.hl(4, 2, 24, GY.blueL);
  g.box(7, 3, 18, 7, GY.screen, GY.O);
  g.hl(9, 5, 6, GY.screenG);
  g.hl(9, 7, 10, GY.screenG);
  g.px(21, 5, GY.orange);
  g.rect(13, 11, 6, 1, GY.orange); // logo strip
  // handrails with dark grips
  g.box(0, 11, 8, 4, GY.plate, GY.O);
  g.box(24, 11, 8, 4, GY.plate, GY.O);
  // uprights
  g.box(4, 13, 4, 14, GY.frame, GY.O);
  g.vl(5, 14, 12, GY.frameL);
  g.box(24, 13, 4, 14, GY.frame, GY.O);
  g.vl(25, 14, 12, GY.frameL);
  g.px(5, 20, GY.orange); // orange accents on the posts
  g.px(26, 20, GY.orange);
  // deck + belt
  g.box(1, 24, 30, 21, GY.blue, GY.O);
  g.vl(2, 25, 19, GY.blueL);
  g.rect(6, 25, 20, 18, GY.belt);
  for (let y = 27; y < 43; y += 4) g.hl(6, y, 20, GY.beltL);
  g.vl(5, 25, 18, GY.O);
  g.vl(26, 25, 18, GY.O);
  g.rect(28, 30, 2, 8, GY.orange); // side stripe
  g.rect(2, 42, 28, 2, GY.blueD); // front cap
  g.hl(10, 43, 12, GY.orangeL);
  // feet
  g.rect(3, 45, 4, 2, GY.O);
  g.rect(25, 45, 4, 2, GY.O);
  return g;
}

function powerRack() {
  // cable tower with a weight stack and a racked barbell; 2 wide, against the wall
  const g = img(32, 48);
  g.rect(2, 45, 28, 3, GY.shadow);
  // frame
  g.box(1, 0, 5, 46, GY.frame, GY.O);
  g.vl(2, 1, 44, GY.frameL);
  g.box(26, 0, 5, 46, GY.frame, GY.O);
  g.vl(27, 1, 44, GY.frameL);
  g.box(1, 0, 30, 5, GY.frame, GY.O);
  g.hl(2, 1, 28, GY.frameL);
  // weight stack on guide rods
  g.vl(12, 5, 30, GY.silver);
  g.vl(19, 5, 30, GY.silver);
  g.box(10, 18, 12, 18, GY.plate, GY.O);
  for (let y = 20; y < 35; y += 3) {
    g.hl(11, y, 10, GY.plateL);
    g.hl(13, y + 1, 2, GY.orange);
  }
  // cable + handle
  g.box(7, 4, 4, 3, GY.frameD, GY.O); // pulley
  g.vl(9, 7, 13, GY.O);
  g.box(7, 20, 5, 4, GY.orange, GY.O);
  g.px(9, 21, GY.orangeL);
  // racked barbell with big plates
  g.rect(0, 29, 32, 2, GY.silver);
  g.hl(0, 31, 32, GY.frameD);
  for (const x of [0, 26]) {
    g.box(x, 23, 6, 14, GY.plate, GY.O);
    g.vl(x + 2, 25, 10, GY.plateL);
  }
  // base
  g.box(0, 43, 32, 4, GY.frameD, GY.O);
  return g;
}

function dumbbellRack() {
  // two tiers of dumbbells, 2 wide, against the wall
  const g = img(32, 32);
  g.rect(2, 29, 28, 3, GY.shadow);
  g.box(1, 6, 4, 24, GY.frame, GY.O);
  g.box(27, 6, 4, 24, GY.frame, GY.O);
  g.box(1, 15, 30, 3, GY.frameD, GY.O);
  g.box(1, 26, 30, 3, GY.frameD, GY.O);
  const bell = (x, y, size) => {
    g.box(x, y - size, 3, size * 2, GY.plate, GY.O);
    g.rect(x + 3, y - 1, 3, 2, GY.silver);
    g.box(x + 6, y - size, 3, size * 2, GY.plate, GY.O);
    g.px(x + 1, y - size + 1, GY.plateL);
    g.px(x + 7, y - size + 1, GY.plateL);
  };
  bell(5, 12, 3);
  bell(14, 12, 3);
  bell(22, 12, 2);
  bell(5, 23, 4);
  bell(14, 23, 4);
  bell(22, 23, 3);
  return g;
}

function weightBench() {
  // flat bench with an orange pad, 2 wide x 1 tall
  const g = img(32, 16);
  g.rect(2, 13, 28, 3, GY.shadow);
  g.box(1, 1, 30, 7, GY.orange, GY.O);
  g.hl(2, 2, 28, GY.orangeL);
  g.box(2, 7, 28, 3, GY.orangeD, GY.O);
  g.box(5, 9, 4, 5, GY.frame, GY.O);
  g.box(23, 9, 4, 5, GY.frame, GY.O);
  g.rect(9, 10, 14, 2, GY.frameD);
  g.box(2, 13, 10, 3, GY.frameD, GY.O);
  g.box(20, 13, 10, 3, GY.frameD, GY.O);
  return g;
}

function barbell() {
  // a loaded barbell lying on the floor, 2 wide (walkable, decoration)
  const g = img(32, 16);
  g.rect(3, 12, 26, 3, GY.shadow);
  g.rect(4, 8, 24, 2, GY.silver);
  for (const x of [1, 26]) {
    g.box(x, 3, 5, 11, GY.plate, GY.O);
    g.vl(x + 2, 5, 7, GY.plateL);
  }
  return g;
}

function yogaMat(c, l, d) {
  // 1x2 flat mat, rolled end at the top
  const g = img(16, 32);
  g.box(2, 3, 12, 28, c);
  g.rect(3, 4, 10, 26, c);
  g.vl(3, 4, 26, l);
  g.vl(12, 4, 26, d);
  g.box(1, 0, 14, 5, d); // roll
  g.hl(2, 1, 12, l);
  return g;
}

function punchingBag() {
  const g = img(16, 32);
  g.vl(8, 0, 4, P.steelD); // chain
  g.box(3, 3, 10, 22, P.red);
  g.rect(4, 4, 3, 20, [236, 120, 110]);
  g.rect(10, 4, 2, 20, P.redD);
  g.hl(3, 8, 10, P.black);
  g.hl(3, 20, 10, P.black);
  g.ellipse(8, 29, 5, 2, P.blackL); // shadow
  return g;
}

/** Pool: tiled rim, water with lane ropes and ripples, ladder. w x h in tiles. */
function pool(wt, ht) {
  const W = wt * 16, H = ht * 16;
  const g = img(W, H);
  const rim = [226, 232, 236], rimD = [176, 186, 196];
  const water = [72, 168, 220], waterD = [52, 132, 196], waterL = [150, 214, 244];
  g.box(0, 0, W, H, rim);
  for (let x = 6; x < W; x += 8) { g.vl(x, 1, 5, rimD); g.vl(x, H - 6, 5, rimD); }
  for (let y = 6; y < H; y += 8) { g.hl(1, y, 5, rimD); g.hl(W - 6, y, 5, rimD); }
  g.box(5, 5, W - 10, H - 10, waterD);
  g.rect(6, 6, W - 12, H - 12, water);
  g.rect(6, 6, W - 12, 3, waterD); // depth shade under the far rim
  // lane ropes
  for (let ly = 1; ly < 3; ly++) {
    const y = Math.round(6 + ((H - 12) * ly) / 3);
    for (let x = 6; x < W - 6; x += 2) g.px(x, y, (x / 2) % 2 ? P.red : P.cream);
  }
  // ripples
  for (let i = 0; i < (wt * ht) / 2; i++) {
    const x = 10 + ((i * 37) % (W - 24)), y = 12 + ((i * 23) % (H - 22));
    g.hl(x, y, 4, waterL);
    g.hl(x + 1, y + 1, 2, waterL);
  }
  // ladder at the near-right corner
  g.rect(W - 18, H - 13, 1, 9, P.steelL);
  g.rect(W - 13, H - 13, 1, 9, P.steelL);
  for (let y = H - 11; y < H - 4; y += 3) g.hl(W - 18, y, 6, P.steel);
  return g;
}

function lounger() {
  // 1x2 sun lounger, back rest up at the top
  const g = img(16, 32);
  g.box(2, 2, 12, 11, P.cream);
  for (let y = 4; y < 12; y += 3) g.hl(3, y, 10, P.blue);
  g.box(2, 12, 12, 17, P.cream);
  for (let y = 14; y < 28; y += 3) g.hl(3, y, 10, P.blue);
  g.rect(3, 29, 2, 3, P.steelD);
  g.rect(11, 29, 2, 3, P.steelD);
  return g;
}

single('ELEVATOR', 'Elevator', 'misc', elevator(), 2, 3, 2);
single('TREADMILL', 'Treadmill', 'misc', treadmill(), 2, 3, 1);
single('DUMBBELL_RACK', 'Dumbbell Rack', 'misc', dumbbellRack(), 2, 2, 1);
single('POWER_RACK', 'Cable Tower', 'misc', powerRack(), 2, 3, 2);
single('BARBELL', 'Barbell', 'misc', barbell(), 2, 1, 1);
single('WEIGHT_BENCH', 'Weight Bench', 'misc', weightBench(), 2, 1, 0);
single('YOGA_MAT', 'Yoga Mat', 'misc', yogaMat([150, 110, 210], [190, 160, 236], [110, 80, 170]), 1, 2, 2);
single('YOGA_MAT_GREEN', 'Yoga Mat Green', 'misc', yogaMat([100, 180, 140], [150, 214, 180], [70, 130, 100]), 1, 2, 2);
single('PUNCHING_BAG', 'Punching Bag', 'misc', punchingBag(), 1, 2, 1);
single('POOL', 'Swimming Pool', 'misc', pool(10, 6), 10, 6, 0);
single('LOUNGER', 'Sun Lounger', 'misc', lounger(), 1, 2, 0);

// replace only our own items: the built-in furniture lives in the same folder
for (const it of items) fs.rmSync(path.join(OUT, it.id), { recursive: true, force: true });
for (const it of items) {
  const dir = path.join(OUT, it.id);
  fs.mkdirSync(dir, { recursive: true });
  for (const [f, g] of Object.entries(it.files)) fs.writeFileSync(path.join(dir, f), g.png());
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(it.manifest, null, 2));
}
console.log('wrote', items.length, 'items to', OUT);
