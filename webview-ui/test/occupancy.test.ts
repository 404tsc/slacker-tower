import { beforeEach, describe, expect, it } from 'vitest';

import { claimTile, mayStep, resetOccupancy, type Walker } from '../src/office/engine/occupancy.js';
import { findPath } from '../src/office/layout/tileMap.js';
import { TileType } from '../src/office/types.js';

const open = (cols: number, rows: number): TileType[][] =>
  Array.from({ length: rows }, () => new Array<TileType>(cols).fill(TileType.FLOOR_1));

function walker(
  col: number,
  row: number,
  to: { col: number; row: number },
  map: TileType[][],
): Walker {
  return {
    tileCol: col,
    tileRow: row,
    path: findPath(col, row, to.col, to.row, map, new Set()),
    moveProgress: 0,
  };
}

describe('occupancy', () => {
  beforeEach(() => resetOccupancy());

  it('steps freely when nobody is in the way', () => {
    const map = open(5, 5);
    const w = walker(0, 2, { col: 4, row: 2 }, map);
    claimTile(0, 2, w);
    expect(mayStep(w, 0.016, map, new Set())).toBe(true);
  });

  it('waits for someone standing on the next tile, then goes around', () => {
    const map = open(5, 5);
    const w = walker(0, 2, { col: 4, row: 2 }, map);
    const blocker = {};
    claimTile(0, 2, w);
    claimTile(w.path[0].col, w.path[0].row, blocker);
    expect(mayStep(w, 0.1, map, new Set())).toBe(false); // waits
    let moved = false;
    for (let i = 0; i < 5 && !moved; i++) moved = mayStep(w, 0.1, map, new Set());
    expect(moved).toBe(true); // found a detour
    const first = w.path[0];
    expect(first.col === 1 && first.row === 2).toBe(false);
    expect(w.path[w.path.length - 1]).toEqual({ col: 4, row: 2 });
  });

  it('stops one tile short when someone stands at the destination', () => {
    const map = open(3, 1);
    const w = walker(0, 0, { col: 1, row: 0 }, map);
    claimTile(1, 0, {});
    expect(mayStep(w, 0.016, map, new Set())).toBe(false);
    expect(w.path).toEqual([]);
  });

  it('squeezes past a jam that does not clear', () => {
    const map = open(3, 1); // one-tile-wide corridor: no way around
    const w = walker(0, 0, { col: 2, row: 0 }, map);
    claimTile(1, 0, {});
    let moved = false;
    for (let t = 0; t < 100 && !moved; t++) moved = mayStep(w, 0.1, map, new Set());
    expect(moved).toBe(true);
  });
});
