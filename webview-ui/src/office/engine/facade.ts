// ─────────────────────────────────────────────────────────────────────────────
// Building facade for the whole-building view: a cut-away villa — sky, a gable
// roof with an attic, stucco walls with timber trim, balconies, and a garden
// with a pool cut into the ground — drawn on an overlay canvas on top of the
// office canvas, with holes where the floors are so the live floors show
// through. Everything is in world pixels (1 tile = 16) and drawn as
// hard-edged blocks so it matches the pixel art.
// ─────────────────────────────────────────────────────────────────────────────

import { FACADE_COLORS as C, facadeSkyColors as skyColors } from '../../constants.js';
import type { OfficeLayout } from '../types.js';
import { TILE_SIZE, TileType } from '../types.js';
import type { Floor } from './building.js';

/** World px of garden kept on each side of the house. */
export const FACADE_PAD_X = 240;
/** World px above the house: the gable roof. */
export const FACADE_PAD_TOP = 150;
/** World px of ground (cross-section) below the house. */
export const FACADE_STREET = 64;
/** Height of the gable roof above the top floor. */
export const ROOF_RISE = 118;
/** Outer wall thickness (world px). */
const SHELL = 8;
const ROOF_OVERHANG = 22;
const ROOF_THICK = 12;
const BALCONY = 84;

interface Bounds {
  /** Building shell in world px */
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

export function buildingBounds(floors: readonly Floor[]): Bounds | null {
  if (floors.length === 0) return null;
  const colStart = Math.min(...floors.map((f) => f.colStart));
  const colEnd = Math.max(...floors.map((f) => f.colEnd));
  const rowStart = Math.min(...floors.map((f) => f.rowStart));
  const rowEnd = Math.max(...floors.map((f) => f.rowEnd));
  return {
    x0: colStart * TILE_SIZE - SHELL,
    x1: (colEnd + 1) * TILE_SIZE + SHELL,
    y0: rowStart * TILE_SIZE,
    y1: (rowEnd + 1) * TILE_SIZE,
  };
}

/** Tiles where the live office shows through: floors plus the decoration row above walls. */
function isHole(layout: OfficeLayout, c: number, r: number): boolean {
  const t = (cc: number, rr: number) =>
    rr < 0 || rr >= layout.rows ? TileType.VOID : layout.tiles[rr * layout.cols + cc];
  return t(c, r) !== TileType.VOID || t(c, r + 1) !== TileType.VOID;
}

type G = CanvasRenderingContext2D;

function rect(g: G, color: string, x: number, y: number, w: number, h: number): void {
  g.fillStyle = color;
  g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/** A filled isosceles triangle, drawn as 2-px pixel steps. */
function gable(g: G, color: string, cx: number, baseY: number, halfW: number, rise: number): void {
  for (let dy = 0; dy < rise; dy += 2) {
    const hw = Math.round(halfW * (1 - dy / rise));
    rect(g, color, cx - hw, baseY - dy - 2, hw * 2, 2);
  }
}

function tree(g: G, x: number, groundY: number, h: number): void {
  const r = Math.round(h * 0.3);
  rect(g, C.trunk, x - 3, groundY - h * 0.45, 6, h * 0.45);
  rect(g, C.leaf, x - r, groundY - h, r * 2, h * 0.62);
  rect(g, C.leaf, x - r - 5, groundY - h * 0.86, r * 2 + 10, h * 0.38);
  rect(g, C.leaf, x - r + 5, groundY - h - 5, r * 2 - 10, 5);
  rect(g, C.leafLight, x - r + 4, groundY - h + 3, r, 7);
  rect(g, C.leafLight, x - r - 2, groundY - h * 0.8, 7, 6);
}

function hedge(g: G, x: number, groundY: number, w: number): void {
  rect(g, C.hedge, x, groundY - 12, w, 12);
  rect(g, C.hedge, x + 3, groundY - 15, w - 6, 3);
  for (let i = 4; i < w - 4; i += 9) rect(g, C.hedgeLight, x + i, groundY - 12, 4, 3);
}

function flowers(g: G, x: number, groundY: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const fx = x + i * 7;
    rect(g, C.leaf, fx + 1, groundY - 5, 1, 5);
    rect(g, i % 2 ? C.flowerA : C.flowerB, fx, groundY - 8, 3, 3);
  }
}

function fence(g: G, x0: number, x1: number, groundY: number): void {
  rect(g, C.picket, x0, groundY - 11, x1 - x0, 2);
  rect(g, C.picket, x0, groundY - 5, x1 - x0, 2);
  for (let x = x0; x < x1; x += 6) {
    rect(g, C.picket, x, groundY - 15, 3, 15);
    rect(g, C.picketShade, x + 2, groundY - 14, 1, 14);
    rect(g, C.picket, x + 1, groundY - 16, 1, 1);
  }
}

function lampPost(g: G, x: number, groundY: number): void {
  rect(g, C.lampPost, x - 1, groundY - 30, 3, 30);
  rect(g, C.lampPost, x - 3, groundY - 34, 7, 4);
  rect(g, C.lampGlow, x - 2, groundY - 33, 5, 2);
}

/** Balcony sticking out of the side wall at a floor's level. */
function balcony(g: G, x: number, w: number, floorY: number, plant: boolean): void {
  rect(g, C.timber, x, floorY, w, 5);
  rect(g, C.timberLight, x, floorY, w, 1);
  // glass railing with a timber handrail and posts
  rect(g, C.glass, x, floorY - 28, w, 28);
  rect(g, C.glassEdge, x, floorY - 28, w, 1);
  rect(g, C.timber, x, floorY - 32, w, 4);
  for (let px = x; px <= x + w - 3; px += Math.max(12, Math.floor((w - 3) / 4))) {
    rect(g, C.timber, px, floorY - 32, 3, 32);
  }
  rect(g, C.timber, x + w - 3, floorY - 32, 3, 32);
  // brackets under it
  rect(g, C.timber, x + 4, floorY + 5, 3, 6);
  rect(g, C.timber, x + w - 7, floorY + 5, 3, 6);
  if (plant) {
    const px = x + w - 16;
    rect(g, C.plinthDark, px, floorY - 7, 9, 7);
    rect(g, C.hedge, px - 2, floorY - 15, 13, 8);
    rect(g, C.flowerA, px + 2, floorY - 16, 2, 2);
    rect(g, C.flowerB, px + 6, floorY - 15, 2, 2);
  }
}

export interface FacadeImages {
  /** House, roof and garden, transparent elsewhere (incl. the floor holes) */
  shell: HTMLCanvasElement;
  /** Opaque exactly where floors show through */
  holes: HTMLCanvasElement;
  /** World px of the images' top-left corner */
  originX: number;
  originY: number;
}

/** Draw the static parts once; redrawn only when the layout changes. */
export function buildFacade(layout: OfficeLayout, floors: readonly Floor[]): FacadeImages | null {
  const b = buildingBounds(floors);
  if (!b) return null;
  const originX = b.x0 - FACADE_PAD_X;
  const originY = b.y0 - FACADE_PAD_TOP;
  const w = b.x1 - b.x0 + FACADE_PAD_X * 2;
  const h = b.y1 - originY + FACADE_STREET;
  const shell = document.createElement('canvas');
  shell.width = w;
  shell.height = h;
  const holes = document.createElement('canvas');
  holes.width = w;
  holes.height = h;
  const g = shell.getContext('2d');
  const m = holes.getContext('2d');
  if (!g || !m) return null;
  g.translate(-originX, -originY);
  m.translate(-originX, -originY);
  const W = b.x1 - b.x0;
  const cx = (b.x0 + b.x1) / 2;
  const groundY = b.y1;

  // ── stucco walls with timber trim ──
  rect(g, C.stucco, b.x0, b.y0 - 4, W, b.y1 - b.y0 + 4);
  for (let y = b.y0; y < b.y1; y += 6) rect(g, C.stuccoShade, b.x0, y, W, 1);
  rect(g, C.timber, b.x0, b.y0 - 4, 6, b.y1 - b.y0 + 4);
  rect(g, C.timber, b.x1 - 6, b.y0 - 4, 6, b.y1 - b.y0 + 4);
  rect(g, C.timberLight, b.x0 + 1, b.y0 - 4, 1, b.y1 - b.y0 + 4);

  // ── floor slabs (timber beam over concrete) and balconies ──
  const sorted = [...floors].sort((a, z) => a.rowStart - z.rowStart);
  for (let i = 0; i < sorted.length - 1; i++) {
    const slabY = (sorted[i].rowEnd + 1) * TILE_SIZE + 4;
    rect(g, C.timber, b.x0 - 6, slabY, W + 12, 4);
    rect(g, C.timberLight, b.x0 - 6, slabY, W + 12, 1);
    rect(g, C.plinth, b.x0 - 4, slabY + 4, W + 8, 6);
    rect(g, C.plinthDark, b.x0 - 4, slabY + 9, W + 8, 1);
    // balconies hang off the floor above this slab: the upper storeys
    const floorY = slabY;
    balcony(g, b.x1 + 4, BALCONY, floorY, true);
    if (i === 0) balcony(g, b.x0 - 4 - BALCONY + 12, BALCONY - 12, floorY, false);
  }

  // ── gable roof with an attic ──
  const roofBase = b.y0 - 4;
  const half = W / 2 + ROOF_OVERHANG;
  // chimney behind the roof slope
  const chx = b.x1 - 150;
  rect(g, C.brick, chx, roofBase - ROOF_RISE * 0.72, 22, ROOF_RISE * 0.72);
  rect(g, C.brickLight, chx, roofBase - ROOF_RISE * 0.72, 22, 2);
  for (let y = roofBase - ROOF_RISE * 0.72 + 6; y < roofBase; y += 5)
    rect(g, C.mortar, chx, y, 22, 1);
  rect(g, C.timber, chx - 2, roofBase - ROOF_RISE * 0.72 - 4, 26, 4);
  // roof: shingle triangle, then the attic triangle inside it
  gable(g, C.shingleDark, cx, roofBase + 2, half + 2, ROOF_RISE + 3);
  gable(g, C.shingle, cx, roofBase, half, ROOF_RISE);
  for (let dy = 4; dy < ROOF_RISE; dy += 6) {
    const hw = Math.round(half * (1 - dy / ROOF_RISE));
    rect(g, C.shingleLight, cx - hw, roofBase - dy, hw * 2, 1);
  }
  const atticHalf = half - ROOF_OVERHANG - ROOF_THICK * 1.6;
  const atticRise = ROOF_RISE * (atticHalf / half);
  gable(g, C.attic, cx, roofBase, atticHalf, atticRise);
  for (let dy = 5; dy < atticRise; dy += 6) {
    const hw = Math.round(atticHalf * (1 - dy / atticRise));
    rect(g, C.stuccoShade, cx - hw, roofBase - dy, hw * 2, 1);
  }
  // round attic window
  const wy = roofBase - atticRise * 0.55;
  for (const [dx, dy, ww] of [
    [-6, -10, 12],
    [-9, -8, 18],
    [-10, -5, 20],
    [-10, -2, 20],
    [-9, 1, 18],
    [-6, 3, 12],
  ] as Array<[number, number, number]>) {
    rect(g, C.timber, cx + dx - 1, wy + dy - 1, ww + 2, 4);
  }
  for (const [dx, dy, ww] of [
    [-5, -9, 10],
    [-8, -7, 16],
    [-9, -4, 18],
    [-9, -1, 18],
    [-8, 1, 16],
    [-5, 3, 10],
  ] as Array<[number, number, number]>) {
    rect(g, C.glass, cx + dx, wy + dy, ww, 2);
  }
  rect(g, C.timber, cx - 1, wy - 9, 2, 14);
  rect(g, C.timber, cx - 9, wy - 2, 18, 2);
  // timber ridge beam and eaves
  rect(g, C.timber, cx - 4, roofBase - ROOF_RISE - 4, 8, 6);
  rect(g, C.timber, b.x0 - ROOF_OVERHANG, roofBase, W + ROOF_OVERHANG * 2, 4);

  // ── foundation plinth ──
  rect(g, C.plinth, b.x0 - 4, groundY - 2, W + 8, 10);
  rect(g, C.plinthDark, b.x0 - 4, groundY + 7, W + 8, 1);

  // ── garden, drawn 1.7x so it reads next to the big house ──
  const GS = 1.7;
  g.save();
  g.translate(b.x0, groundY);
  g.scale(GS, GS);
  g.translate(-b.x0, -groundY);
  // ── left garden: porch, path stones, hedge, flowers, trees, fence ──
  const lx = b.x0;
  // porch with steps and a little roof by the ground-floor entrance
  rect(g, C.stone, lx - 46, groundY - 6, 46, 6);
  rect(g, C.stone, lx - 56, groundY - 3, 10, 3);
  rect(g, C.timber, lx - 44, groundY - 40, 3, 34);
  rect(g, C.timber, lx - 46, groundY - 44, 46, 4);
  rect(g, C.shingle, lx - 50, groundY - 48, 50, 4);
  lampPost(g, lx - 30, groundY - 6);
  for (let i = 0; i < 3; i++) rect(g, C.stone, lx - 70 - i * 14, groundY - 1, 9, 2);
  hedge(g, lx - 112, groundY, 22);
  flowers(g, lx - 86, groundY, 2);
  tree(g, lx - 128, groundY, 60);
  tree(g, lx - 98, groundY, 40);
  fence(g, lx - 140, lx - 116, groundY);
  g.restore();
  g.save();
  g.translate(b.x1, groundY);
  g.scale(GS, GS);
  g.translate(-b.x1, -groundY);

  // ── right garden: lounger, umbrella, pool cut into the ground, trees ──
  const rx = b.x1;
  // sun lounger
  rect(g, C.lounger, rx + 16, groundY - 7, 26, 3);
  rect(g, C.lounger, rx + 38, groundY - 14, 4, 8);
  for (let i = 0; i < 24; i += 4) rect(g, C.loungerStripe, rx + 17 + i, groundY - 7, 2, 3);
  rect(g, C.timber, rx + 18, groundY - 4, 2, 4);
  rect(g, C.timber, rx + 38, groundY - 4, 2, 4);
  // pool: tiled basin below the grass line
  const px0 = rx + 48;
  const px1 = rx + 118;
  rect(g, C.poolTile, px0, groundY - 2, px1 - px0, 28);
  rect(g, C.water, px0 + 4, groundY + 3, px1 - px0 - 8, 20);
  for (let y = groundY + 8; y < groundY + 22; y += 6)
    for (let x = px0 + 8 + ((y / 6) % 2) * 7; x < px1 - 12; x += 16)
      rect(g, C.waterLight, x, y, 6, 1);
  rect(g, C.waterLight, px0 + 4, groundY + 3, px1 - px0 - 8, 2);
  // ladder
  rect(g, C.plinth, px1 - 16, groundY - 9, 2, 20);
  rect(g, C.plinth, px1 - 10, groundY - 9, 2, 20);
  for (let y = groundY - 2; y < groundY + 12; y += 4) rect(g, C.plinth, px1 - 16, y, 8, 1);
  // umbrella
  rect(g, C.timber, rx + 128, groundY - 30, 2, 30);
  for (let i = 0; i < 6; i++) {
    rect(
      g,
      i % 2 ? C.umbrellaB : C.umbrellaA,
      rx + 111 + i * 6,
      groundY - 34 + Math.abs(2.5 - i),
      6,
      5,
    );
  }
  rect(g, C.umbrellaA, rx + 124, groundY - 38, 10, 4);
  flowers(g, rx + 4, groundY, 1);
  tree(g, rx + 132, groundY, 52);
  fence(g, rx + 116, rx + 140, groundY);
  g.restore();

  // ── holes: punch the floors out of the house, record them in the mask ──
  m.fillStyle = C.shellEdge;
  for (let r = 0; r < layout.rows; r++)
    for (let c = 0; c < layout.cols; c++) {
      if (!isHole(layout, c, r)) continue;
      g.clearRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      m.fillRect(c * TILE_SIZE, r * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  return { shell, holes, originX, originY };
}

/** Deterministic pseudo-random in [0,1) for star / cloud / pebble placement. */
function rand(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Draw one frame of the facade onto the overlay canvas. `offsetX/offsetY` is
 * where world (0,0) lands in device px (same as the office renderer).
 */
export function drawFacade(
  ctx: CanvasRenderingContext2D,
  img: FacadeImages,
  floors: readonly Floor[],
  zoom: number,
  offsetX: number,
  offsetY: number,
  timeSec: number,
  hour: number,
): void {
  const { width, height } = ctx.canvas;
  const b = buildingBounds(floors);
  if (!b) return;
  const sx = (wx: number) => Math.round(offsetX + wx * zoom);
  const sy = (wy: number) => Math.round(offsetY + wy * zoom);
  const block = (wx: number, wy: number, ww: number, wh: number) =>
    ctx.fillRect(sx(wx), sy(wy), sx(wx + ww) - sx(wx), sy(wy + wh) - sy(wy));

  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = false;

  // sky
  const sky = skyColors(hour);
  const grad = ctx.createLinearGradient(0, sy(b.y0 - FACADE_PAD_TOP * 1.5), 0, sy(b.y1));
  grad.addColorStop(0, sky.top);
  grad.addColorStop(1, sky.bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, sy(b.y1));

  // stars or sun, and drifting clouds
  const viewW = width / zoom;
  const leftWorld = -offsetX / zoom;
  if (sky.night) {
    ctx.fillStyle = C.star;
    for (let i = 0; i < 90; i++) {
      const wx = leftWorld + rand(i) * viewW;
      const wy = b.y0 - FACADE_PAD_TOP * 1.5 + rand(i + 500) * (b.y1 - b.y0 + FACADE_PAD_TOP);
      if (Math.sin(timeSec * 1.5 + i) > 0.85) continue; // twinkle
      block(wx, wy, 1, 1);
    }
    ctx.fillStyle = C.moon;
    block(b.x1 + 70, b.y0 - 120, 12, 12);
  } else {
    ctx.fillStyle = C.sun;
    block(b.x1 + 70, b.y0 - 124, 14, 14);
  }
  ctx.fillStyle = C.cloud;
  ctx.globalAlpha = sky.night ? 0.25 : 0.9;
  for (let i = 0; i < 6; i++) {
    const span = viewW + 120;
    const wx = leftWorld - 60 + ((rand(i + 40) * span + timeSec * (2 + i * 0.6)) % span);
    const wy = b.y0 - 130 + rand(i + 80) * (b.y1 - b.y0) * 0.8;
    block(wx, wy, 26, 5);
    block(wx + 6, wy - 4, 14, 4);
  }
  ctx.globalAlpha = 1;

  // ground in cross-section: grass, then soil with pebbles
  const gy = b.y1;
  ctx.fillStyle = C.soil;
  ctx.fillRect(0, sy(gy), width, height - sy(gy));
  ctx.fillStyle = C.soilDark;
  for (let y = gy + 14; y < gy + FACADE_STREET * 2; y += 10) block(leftWorld, y, viewW, 1);
  ctx.fillStyle = C.pebble;
  for (let i = 0; i < 160; i++) {
    const wx = Math.floor(leftWorld / 400) * 400 + rand(i + 900) * (viewW + 400);
    block(wx, gy + 8 + rand(i + 1300) * 120, 3, 2);
  }
  ctx.fillStyle = C.grass;
  ctx.fillRect(0, sy(gy - 1), width, sy(gy + 6) - sy(gy - 1));
  ctx.fillStyle = C.grassLight;
  ctx.fillRect(0, sy(gy - 1), width, Math.max(1, sy(gy + 1) - sy(gy - 1)));

  // the house (floors cut out) and garden
  ctx.drawImage(
    img.shell,
    sx(img.originX),
    sy(img.originY),
    sx(img.originX + img.shell.width) - sx(img.originX),
    sy(img.originY + img.shell.height) - sy(img.originY),
  );

  // chimney smoke
  ctx.fillStyle = C.smoke;
  const chx = b.x1 - 150 + 11;
  const chTop = b.y0 - 4 - ROOF_RISE * 0.72 - 4;
  for (let i = 0; i < 4; i++) {
    const p = (timeSec * 0.35 + i / 4) % 1;
    ctx.globalAlpha = 0.75 * (1 - p);
    const s = 4 + p * 8;
    block(chx - s / 2 + Math.sin(p * 6 + i) * 4 + p * 14, chTop - 6 - p * 46, s, s * 0.8);
  }
  ctx.globalAlpha = 1;

  // finally make the floor holes see-through again (sky was painted under them)
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(
    img.holes,
    sx(img.originX),
    sy(img.originY),
    sx(img.originX + img.holes.width) - sx(img.originX),
    sy(img.originY + img.holes.height) - sy(img.originY),
  );
  ctx.globalCompositeOperation = 'source-over';
}
