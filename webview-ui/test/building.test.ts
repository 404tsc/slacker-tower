import { describe, expect, it } from 'vitest';

import { floorOfRow, getFloors, isPortalJump, setBuilding } from '../src/office/engine/building.js';
import { findPath } from '../src/office/layout/tileMap.js';
import type { OfficeLayout } from '../src/office/types.js';
import { TileType } from '../src/office/types.js';

/** Two 6x4 floors (rows 0-4 upper, rows 7-11 lower) with an elevator on each. */
function twoFloors(): OfficeLayout {
  const cols = 6;
  const rows = 12;
  const tiles: TileType[] = new Array(cols * rows).fill(TileType.VOID);
  for (const r0 of [1, 8])
    for (let r = r0; r < r0 + 4; r++)
      for (let c = 0; c < cols; c++)
        tiles[r * cols + c] =
          r === r0 || c === 0 || c === cols - 1 ? TileType.WALL : TileType.FLOOR_1;
  return {
    version: 1,
    cols,
    rows,
    tiles,
    furniture: [
      { uid: 'e1', type: 'ELEVATOR', col: 2, row: -1 },
      { uid: 'e2', type: 'ELEVATOR', col: 2, row: 6 },
    ],
  } as OfficeLayout;
}

describe('building', () => {
  it('splits the map into floors, bottom first', () => {
    setBuilding(twoFloors());
    const floors = getFloors();
    expect(floors.map((f) => f.tag)).toEqual(['1F', '2F']);
    expect(floorOfRow(10)).toBe(0);
    expect(floorOfRow(3)).toBe(1);
  });

  it('paths between floors through the elevator', () => {
    const layout = twoFloors();
    setBuilding(layout);
    const tileMap: TileType[][] = [];
    for (let r = 0; r < layout.rows; r++)
      tileMap.push(layout.tiles.slice(r * layout.cols, (r + 1) * layout.cols));
    const path = findPath(4, 3, 4, 10, tileMap, new Set());
    expect(path.length).toBeGreaterThan(0);
    expect(path[path.length - 1]).toEqual({ col: 4, row: 10 });
    const steps = [{ col: 4, row: 3 }, ...path];
    const rides = steps.slice(1).filter((s, i) => isPortalJump(steps[i], s));
    expect(rides).toHaveLength(1);
  });
});
