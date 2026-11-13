// ─────────────────────────────────────────────────────────────────────────────
// Fork: walkers (people and pets) no longer walk through each other. Every
// frame each one claims the tile it stands on and the tile it is stepping
// into. Before stepping onto a tile someone else holds, a walker waits; after a
// short wait it looks for a way around; if the tile it wanted was the end of
// its walk it just stops one tile short. As a last resort (a doorway jam that
// doesn't clear) it squeezes past after 8 seconds, so nobody gets stuck.
// ─────────────────────────────────────────────────────────────────────────────

import { findPath } from '../layout/tileMap.js';
import type { TileType as TileTypeVal } from '../types.js';

/** Wait this long before looking for a way around. */
const REPATH_AFTER_SEC = 0.4;
/** Give up waiting and squeeze past after this long (only a real jam lasts this long). */
const SQUEEZE_AFTER_SEC = 8;

const key = (c: number, r: number) => `${c},${r}`;
const taken = new Map<string, object>();

export function resetOccupancy(): void {
  taken.clear();
}

/** Claim a tile for `who` (first claim wins). */
export function claimTile(col: number, row: number, who: object): void {
  const k = key(col, row);
  if (!taken.has(k)) taken.set(k, who);
}

export function isTakenByOther(col: number, row: number, who: object): boolean {
  const o = taken.get(key(col, row));
  return o !== undefined && o !== who;
}

export interface Walker {
  tileCol: number;
  tileRow: number;
  path: Array<{ col: number; row: number }>;
  moveProgress: number;
  /** Seconds spent waiting for the next tile to clear */
  blockedTimer?: number;
}

/**
 * May `w` start its next step now? Call before advancing along the path.
 * Returns false while it should wait (the path may be shortened or rerouted).
 */
export function mayStep(
  w: Walker,
  dt: number,
  tileMap: TileTypeVal[][],
  blockedTiles: Set<string>,
): boolean {
  if (w.moveProgress > 0) return true; // already mid-step: finish it
  const next = w.path[0];
  if (!next) return true;
  if (!isTakenByOther(next.col, next.row, w)) {
    w.blockedTimer = 0;
    return true;
  }
  // Someone stands where the walk ends: stop right here instead
  if (w.path.length === 1) {
    w.path = [];
    w.blockedTimer = 0;
    return false;
  }
  const before = w.blockedTimer ?? 0;
  const after = before + dt;
  w.blockedTimer = after;
  if (after >= SQUEEZE_AFTER_SEC) {
    w.blockedTimer = 0;
    return true;
  }
  // Every REPATH_AFTER_SEC of waiting, try a route around the others
  if (Math.floor(after / REPATH_AFTER_SEC) > Math.floor(before / REPATH_AFTER_SEC)) {
    const dest = w.path[w.path.length - 1];
    const avoid = new Set(blockedTiles);
    for (const [k, o] of taken) if (o !== w) avoid.add(k);
    avoid.delete(key(dest.col, dest.row));
    const detour = findPath(w.tileCol, w.tileRow, dest.col, dest.row, tileMap, avoid);
    if (detour.length > 0 && !isTakenByOther(detour[0].col, detour[0].row, w)) {
      w.path = detour;
      w.blockedTimer = 0;
      return true;
    }
  }
  return false;
}
