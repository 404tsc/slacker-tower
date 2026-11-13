// ─────────────────────────────────────────────────────────────────────────────
// Building: a layout may stack several floors vertically, separated by empty
// (VOID) rows. Each floor is a horizontal band of the map. ELEVATOR furniture
// links the floors: the walkable tiles in front of an elevator's doors are
// "portals", and pathfinding may jump from a portal to the matching portal on
// any other floor (an elevator ride).
// ─────────────────────────────────────────────────────────────────────────────

import { getCatalogEntry } from '../layout/furnitureCatalog.js';
import type { OfficeLayout } from '../types.js';
import { TileType } from '../types.js';

export const ELEVATOR_TYPE = 'ELEVATOR';

export interface Floor {
  /** 0 = ground floor (the lowest band of the map) */
  index: number;
  /** "1F", "2F", … */
  tag: string;
  /** Friendly name from the rooms on it, e.g. "办公室" */
  name: string;
  /** Inclusive tile bounds of the floor, including its wall-decoration row */
  rowStart: number;
  rowEnd: number;
  colStart: number;
  colEnd: number;
}

/** Floor name by the rooms (Area labels) it contains — first match wins. */
const FLOOR_NAMES: Array<{ match: RegExp; name: string }> = [
  { match: /卧室|房间/, name: '卧室' },
  { match: /健身|泳池/, name: '健身·泳池' },
  { match: /市场|设计|技术|办公/, name: '办公室' },
];

let floors: Floor[] = [];
let floorOfRowArr: number[] = [];
const portals = new Map<string, Array<{ col: number; row: number }>>();

const key = (c: number, r: number) => `${c},${r}`;

/** Recompute floors and elevator links. Call whenever the layout changes. */
export function setBuilding(layout: OfficeLayout): void {
  const { cols, rows, tiles } = layout;
  const hasTile: boolean[] = [];
  for (let r = 0; r < rows; r++) {
    let any = false;
    for (let c = 0; c < cols && !any; c++) {
      const t = tiles[r * cols + c];
      if (t !== undefined && t !== TileType.VOID) any = true;
    }
    hasTile.push(any);
  }

  // Bands of rows with tiles; a run of 2+ empty rows separates floors. A single
  // empty row above a band (where wall decorations hang) belongs to that band.
  const bands: Array<{ start: number; end: number }> = [];
  let r = 0;
  while (r < rows) {
    if (!hasTile[r]) {
      r++;
      continue;
    }
    let start = r;
    let end = r;
    let gap = 0;
    for (let k = r; k < rows; k++) {
      if (hasTile[k]) {
        end = k;
        gap = 0;
      } else if (++gap >= 2) break;
    }
    if (start > 0 && !hasTile[start - 1]) start--;
    bands.push({ start, end });
    r = end + 1;
  }

  floorOfRowArr = new Array(rows).fill(-1);
  floors = bands
    .slice()
    .reverse() // bottom band = ground floor
    .map((b, index) => {
      let colStart = cols;
      let colEnd = -1;
      const labels = new Set<string>();
      for (let rr = b.start; rr <= b.end; rr++)
        for (let c = 0; c < cols; c++) {
          const i = rr * cols + c;
          if (tiles[i] === TileType.VOID) continue;
          colStart = Math.min(colStart, c);
          colEnd = Math.max(colEnd, c);
          const a = layout.areaTiles?.[i];
          if (a) labels.add(a);
        }
      const all = [...labels].join(' ');
      const name = FLOOR_NAMES.find((n) => n.match.test(all))?.name ?? [...labels][0] ?? '';
      for (let rr = b.start; rr <= b.end; rr++) floorOfRowArr[rr] = index;
      return {
        index,
        tag: `${index + 1}F`,
        name,
        rowStart: b.start,
        rowEnd: b.end,
        colStart: Math.max(0, colStart),
        colEnd: Math.max(colStart, colEnd),
      };
    });

  // Elevator doors: the floor tiles right in front of each ELEVATOR
  portals.clear();
  const doorsByFloor = new Map<number, Array<{ col: number; row: number }>>();
  for (const item of layout.furniture) {
    if (item.type.split(':')[0] !== ELEVATOR_TYPE) continue;
    const entry = getCatalogEntry(item.type);
    const w = entry?.footprintW ?? 2;
    const h = entry?.footprintH ?? 3;
    const row = item.row + h;
    const f = floorOfRow(row);
    if (f < 0) continue;
    const list = doorsByFloor.get(f) ?? [];
    for (let c = item.col; c < item.col + w; c++) {
      const t = tiles[row * cols + c];
      if (t !== undefined && t !== TileType.WALL && t !== TileType.VOID) list.push({ col: c, row });
    }
    doorsByFloor.set(f, list);
  }
  const all = [...doorsByFloor.values()];
  for (const doors of all) {
    doors.forEach((d, i) => {
      const exits: Array<{ col: number; row: number }> = [];
      for (const other of all) {
        if (other === doors || other.length === 0) continue;
        exits.push(other[Math.min(i, other.length - 1)]);
      }
      if (exits.length > 0) portals.set(key(d.col, d.row), exits);
    });
  }
}

/** True while the whole-building (villa) view is showing — door signs hide then. */
let overview = false;
export function setBuildingOverview(v: boolean): void {
  overview = v;
}
export function isBuildingOverview(): boolean {
  return overview;
}

export function getFloors(): readonly Floor[] {
  return floors;
}

/** Floor index of a tile row, or -1 outside every floor. */
export function floorOfRow(row: number): number {
  return floorOfRowArr[row] ?? -1;
}

/** Tiles an elevator at (col,row) can take you to, if it is an elevator door. */
export function portalExits(
  col: number,
  row: number,
): Array<{ col: number; row: number }> | undefined {
  return portals.get(key(col, row));
}

/** A step that is not to a neighbouring tile is an elevator ride. */
export function isPortalJump(
  from: { col: number; row: number },
  to: { col: number; row: number },
): boolean {
  return Math.abs(from.col - to.col) + Math.abs(from.row - to.row) > 1;
}

/** A random tile on the same floor as `row` (wandering stays on one floor). */
export function randomTileOnFloor<T extends { row: number }>(
  tiles: T[],
  row: number,
): T | undefined {
  if (tiles.length === 0) return undefined;
  const f = floorOfRow(row);
  for (let i = 0; i < 16; i++) {
    const t = tiles[Math.floor(Math.random() * tiles.length)];
    if (f < 0 || floorOfRow(t.row) === f) return t;
  }
  return tiles[Math.floor(Math.random() * tiles.length)];
}
