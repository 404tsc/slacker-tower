import { useEffect, useState } from 'react';

import { OVERLAY_LABEL_Z_INDEX } from '../../constants.js';
import { tName } from '../../i18n.js';
import { isBuildingOverview } from '../engine/building.js';
import type { OfficeState } from '../engine/officeState.js';
import { overlayProjection } from '../projection.js';
import type { OfficeLayout } from '../types.js';
import { TILE_SIZE, TileType } from '../types.js';

/** Emoji shown before a room's name on its door sign. */
const ROOM_EMOJI: Record<string, string> = {
  市场部: '📣',
  设计部: '🎨',
  技术部: '💻',
  会议室: '🗣️',
  茶水间: '☕',
  休息区: '🛋️',
  卧室: '🛏️',
  健身房: '🏋️',
  泳池: '🏊',
  电梯厅: '🛗',
  猫舍: '🐱',
};

function roomEmoji(label: string): string | undefined {
  return ROOM_EMOJI[label] ?? (label.includes('卧室') ? '🛏️' : undefined);
}

interface Sign {
  label: string;
  /** World pixel position: the sign's center x and top y */
  x: number;
  y: number;
}

/** One sign per named Area, hung over its door(s) on the wall band. */
function computeRoomSigns(layout: OfficeLayout): Sign[] {
  const { cols, rows, tiles, areaTiles } = layout;
  if (!areaTiles || !layout.areas?.length) return [];
  const at = (c: number, r: number) =>
    c < 0 || r < 0 || c >= cols || r >= rows ? -1 : r * cols + c;
  const isFloor = (i: number) => i >= 0 && tiles[i] !== TileType.WALL && tiles[i] !== TileType.VOID;

  const signs: Sign[] = [];
  for (const { label } of layout.areas) {
    let minC = Infinity;
    let maxC = -1;
    let minR = Infinity;
    let maxR = -1;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (areaTiles[at(c, r)] === label) {
          minC = Math.min(minC, c);
          maxC = Math.max(maxC, c);
          minR = Math.min(minR, r);
          maxR = Math.max(maxR, r);
        }
    if (maxC < 0) continue;

    // Door tiles: floor in the wall line just outside the room's top or bottom edge
    let placed = false;
    for (const doorRow of [maxR + 1, minR - 1]) {
      const doorCols: number[] = [];
      for (let c = minC; c <= maxC; c++) {
        const i = at(c, doorRow);
        if (isFloor(i) && areaTiles[i] !== label) doorCols.push(c);
      }
      if (doorCols.length === 0) continue;
      const mid = (doorCols[0] + doorCols[doorCols.length - 1] + 1) / 2;
      signs.push({ label, x: mid * TILE_SIZE, y: (doorRow - 1) * TILE_SIZE + 5 });
      placed = true;
      break;
    }
    // No door found: hang it on the room's back wall instead
    if (!placed) {
      signs.push({ label, x: ((minC + maxC + 1) / 2) * TILE_SIZE, y: (minR - 2) * TILE_SIZE + 4 });
    }
  }
  return signs;
}

interface RoomSignsProps {
  officeState: OfficeState;
  containerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  panRef: React.RefObject<{ x: number; y: number }>;
}

export function RoomSigns({ officeState, containerRef, zoom, panRef }: RoomSignsProps) {
  // Follow camera pans frame by frame, like the agent labels do
  const [, setTick] = useState(0);
  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      setTick((n) => n + 1);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const layout = officeState.getLayout();
  // Cheap (one pass over the grid per Area), so it simply follows layout edits
  const signs = computeRoomSigns(layout);

  const el = containerRef.current;
  if (!el || signs.length === 0 || isBuildingOverview()) return null;
  const dpr = window.devicePixelRatio || 1;
  const project = overlayProjection(layout, el.getBoundingClientRect(), zoom, panRef.current, dpr);
  const cssPerWorld = zoom / dpr;

  return (
    <>
      {signs.map((s) => (
        <div
          key={s.label}
          className="absolute -translate-x-1/2 pointer-events-none whitespace-nowrap pixel-panel border-border"
          style={{
            left: project.toScreenX(s.x),
            top: project.toScreenY(s.y),
            fontSize: Math.max(12, 7.5 * cssPerWorld),
            lineHeight: 1,
            padding: `${Math.max(1, cssPerWorld)}px ${Math.max(4, 3 * cssPerWorld)}px`,
            zIndex: OVERLAY_LABEL_Z_INDEX - 1,
          }}
          data-testid="room-sign"
        >
          {roomEmoji(s.label) ? `${roomEmoji(s.label)} ` : ''}
          {tName(s.label)}
        </div>
      ))}
    </>
  );
}
