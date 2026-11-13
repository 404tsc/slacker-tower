// ─────────────────────────────────────────────────────────────────────────────
// Breaks: idle characters sometimes walk to furniture to drink, eat, have a
// coffee or nap, and the whole office goes on a break at reminder times
// (water every full hour, meals at 8:00 / 12:00 / 18:00, local time).
// ─────────────────────────────────────────────────────────────────────────────

import type { MsgKey } from '../../i18n.js';
import { getCatalogEntry } from '../layout/furnitureCatalog.js';
import { findPath, isWalkable } from '../layout/tileMap.js';
import type {
  BreakKind,
  BreakMount,
  Character,
  MountKind,
  PlacedFurniture,
  TileType as TileTypeVal,
} from '../types.js';
import { CharacterState, Direction, TILE_SIZE } from '../types.js';

/** Chance that an idle wander decision becomes a break instead. */
const BREAK_CHANCE = 0.3;
const BREAK_MIN_SEC = 8;
const BREAK_MAX_SEC = 16;
const NAP_MIN_SEC = 20;
const NAP_MAX_SEC = 40;
/** Bed sprite: the blanket's top edge, where a sleeper's chin goes (px from bed top). */
const BED_CHIN_Y = 21;
const GROUP_BREAK_SEC = 25;
/** After a break, wait this long before the next spontaneous one. */
const BREAK_COOLDOWN_SEC = 20;

export const BREAK_EMOJI: Record<BreakKind, string> = {
  drink: '💧',
  coffee: '☕',
  eat: '🍚',
  nap: '💤',
  relax: '📱',
  workout: '🏋️',
  swim: '🏊',
};

/** Pool: how many can swim at once. Other furniture takes one person. */
const POOL_CAPACITY = 4;
/** Treadmill sprite: where the runner's feet are (px from its top). */
const TREADMILL_FEET_Y = 38;

/** Furniture a character climbs onto, rather than standing next to. */
function mountKindFor(type: string): MountKind | null {
  const t = baseType(type);
  if (t.startsWith('BED_')) return 'sleep';
  if (t === 'POOL') return 'swim';
  if (t === 'TREADMILL') return 'run';
  return null;
}

function baseType(type: string): string {
  return type.split(':')[0];
}

function matchesKind(type: string, kind: BreakKind): boolean {
  const t = baseType(type);
  switch (kind) {
    case 'drink':
      return t.startsWith('COFFEE') || t === 'WATER_COOLER' || t === 'FRIDGE';
    case 'coffee':
      return t.startsWith('COFFEE');
    case 'eat':
      return (
        t.startsWith('TABLE') ||
        t.startsWith('SMALL_TABLE') ||
        t === 'COFFEE_TABLE' ||
        t === 'DINING_TABLE' ||
        t === 'LOUNGE_TABLE' ||
        t === 'ROUND_TABLE' ||
        t === 'ROUND_COFFEE_TABLE'
      );
    case 'nap':
      return t.startsWith('BED_');
    case 'relax':
      return (
        t.startsWith('SOFA') ||
        (t.endsWith('_BENCH') && t !== 'WEIGHT_BENCH') ||
        t.startsWith('ARMCHAIR') ||
        t.startsWith('LOVESEAT') ||
        t === 'CURVED_SOFA' ||
        t.startsWith('BEANBAG') ||
        t.startsWith('LOUNGER')
      );
    case 'workout':
      return (
        t === 'TREADMILL' ||
        t === 'DUMBBELL_RACK' ||
        t === 'POWER_RACK' ||
        t === 'WEIGHT_BENCH' ||
        t.startsWith('YOGA_MAT') ||
        t === 'PUNCHING_BAG'
      );
    case 'swim':
      return t === 'POOL';
  }
}

interface Spot {
  col: number;
  row: number;
  /** Direction to face the furniture once there */
  dir: Direction;
  /** Furniture next to this spot to climb onto on arrival (bed, pool, treadmill) */
  bed?: BreakMount;
}

/** Walkable tiles next to furniture of the given kind. */
function spotsFor(
  kind: BreakKind,
  furniture: PlacedFurniture[],
  tileMap: TileTypeVal[][],
  blockedTiles: Set<string>,
): Spot[] {
  const spots: Spot[] = [];
  for (const item of furniture) {
    if (!matchesKind(item.type, kind)) continue;
    const entry = getCatalogEntry(item.type);
    const w = entry?.footprintW ?? 1;
    const h = entry?.footprintH ?? 1;
    const mount = mountKindFor(item.type);
    const bed = mount
      ? { uid: item.uid, col: item.col, row: item.row, w, h, kind: mount }
      : undefined;
    for (let c = item.col; c < item.col + w; c++) {
      for (let r = item.row; r < item.row + h; r++) {
        const around: Spot[] = [
          { col: c, row: r + 1, dir: Direction.UP },
          { col: c, row: r - 1, dir: Direction.DOWN },
          { col: c - 1, row: r, dir: Direction.RIGHT },
          { col: c + 1, row: r, dir: Direction.LEFT },
        ];
        for (const s of around) {
          if (isWalkable(s.col, s.row, tileMap, blockedTiles)) spots.push(bed ? { ...s, bed } : s);
        }
      }
    }
  }
  return spots;
}

function randomRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function pickKind(): BreakKind {
  const r = Math.random();
  if (r < 0.18) return 'drink';
  if (r < 0.3) return 'coffee';
  if (r < 0.4) return 'eat';
  if (r < 0.55) return 'relax';
  if (r < 0.72) return 'workout';
  if (r < 0.85) return 'swim';
  return 'nap';
}

export interface BreakWorld {
  furniture: PlacedFurniture[];
  tileMap: TileTypeVal[][];
  blockedTiles: Set<string>;
  /** Room label per tile (row-major), from the layout's Areas */
  areaTiles?: Array<string | null>;
  cols?: number;
  /** All characters, to keep one sleeper per bed */
  characters?: Character[];
}

/**
 * Which room each kind of break happens in: drinking, coffee and meals in the
 * tea room, lounging in the lounge, sleeping in the bedroom. Matched by
 * substring of the Area label.
 */
const BREAK_ROOM: Record<BreakKind, string> = {
  drink: '茶水',
  coffee: '茶水',
  eat: '茶水',
  relax: '休息',
  nap: '卧室',
  workout: '健身',
  swim: '泳池',
};

/** A role's name without its emoji, e.g. "✍️ 文案" → "文案". */
function plainRoleName(name: string | undefined): string {
  return (name ?? '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
}

/** Mounts already full (people asleep / swimming / running there, or on the way). */
function takenBeds(ch: Character, world: BreakWorld): Set<string> {
  const count = new Map<string, number>();
  const add = (uid: string) => count.set(uid, (count.get(uid) ?? 0) + 1);
  for (const o of world.characters ?? []) {
    if (o === ch) continue;
    if (o.sleep) add(o.sleep.bedUid);
    else if (o.breakBed) add(o.breakBed.uid);
  }
  const taken = new Set<string>();
  for (const item of world.furniture) {
    const n = count.get(item.uid) ?? 0;
    const cap = mountKindFor(item.type) === 'swim' ? POOL_CAPACITY : 1;
    if (n >= cap) taken.add(item.uid);
  }
  return taken;
}

/** Climb on: into the bed, into the pool, onto the treadmill. */
function tuckIn(ch: Character): void {
  const bed = ch.breakBed;
  if (!bed) return;
  const top = bed.row * TILE_SIZE;
  const bottomZ = (bed.row + bed.h) * TILE_SIZE + 0.5;
  if (bed.kind === 'swim') {
    // Somewhere in the water, away from the pool's rim
    ch.sleep = {
      kind: 'swim',
      bedUid: bed.uid,
      x: Math.round((bed.col + 1 + Math.random() * (bed.w - 2)) * TILE_SIZE),
      y: Math.round((bed.row + 1.7 + Math.random() * Math.max(0, bed.h - 2.6)) * TILE_SIZE),
      zY: bottomZ,
    };
  } else if (bed.kind === 'run') {
    ch.sleep = {
      kind: 'run',
      bedUid: bed.uid,
      x: (bed.col + bed.w / 2) * TILE_SIZE,
      y: top + TREADMILL_FEET_Y,
      zY: bottomZ,
    };
  } else {
    ch.sleep = {
      kind: 'sleep',
      bedUid: bed.uid,
      x: (bed.col + bed.w / 2) * TILE_SIZE,
      y: top + BED_CHIN_Y,
      zY: top + 3 * TILE_SIZE + 0.5,
    };
  }
  ch.x = ch.sleep.x;
  ch.y = ch.sleep.y;
  ch.breakDir = Direction.DOWN;
  ch.dir = Direction.DOWN;
}

/** Get out of bed back onto the tile the character walked to. */
function wakeUp(ch: Character): void {
  // (a layout rebuild may already have moved the character elsewhere)
  if (ch.sleep && ch.x === ch.sleep.x && ch.y === ch.sleep.y) {
    ch.x = ch.tileCol * TILE_SIZE + TILE_SIZE / 2;
    ch.y = ch.tileRow * TILE_SIZE + TILE_SIZE / 2;
  }
  ch.sleep = null;
  ch.breakBed = null;
}

/** Keep only spots inside the kind's room; if that room has none, keep all. */
function inBreakRoom(spots: Spot[], kind: BreakKind, world: BreakWorld, ch: Character): Spot[] {
  const tiles = world.areaTiles;
  const cols = world.cols;
  if (!tiles || !cols) return spots;
  const room = BREAK_ROOM[kind];
  const inside = spots.filter((s) => tiles[s.row * cols + s.col]?.includes(room));
  // Sleep in your own bedroom (the one named after your role), if there is one
  const role = plainRoleName(ch.directoryName);
  if (kind === 'nap' && role) {
    const own = inside.filter((s) => tiles[s.row * cols + s.col]?.includes(role));
    if (own.length > 0) return own;
  }
  return inside.length > 0 ? inside : spots;
}

export function clearBreak(ch: Character): void {
  wakeUp(ch);
  ch.breakKind = null;
  ch.breakPhase = null;
  ch.breakTimer = 0;
}

/** Send a character on a break. Returns false when it cannot go now. */
export function startBreak(
  ch: Character,
  kind: BreakKind,
  world: BreakWorld,
  durationSec?: number,
): boolean {
  if (ch.isActive || ch.isSubagent || ch.matrixEffect) return false;
  // Mid-step between two tiles: wait until the step lands, then go
  if (ch.state === CharacterState.WALK && ch.moveProgress > 0) return false;
  const duration =
    durationSec ??
    (kind === 'nap'
      ? randomRange(NAP_MIN_SEC, NAP_MAX_SEC)
      : randomRange(BREAK_MIN_SEC, BREAK_MAX_SEC));

  const taken = takenBeds(ch, world);
  const spots = inBreakRoom(
    spotsFor(kind, world.furniture, world.tileMap, world.blockedTiles).filter(
      (s) => !s.bed || !taken.has(s.bed.uid),
    ),
    kind,
    world,
    ch,
  );
  // Every bed is taken (or the pool is full): lounge on the sofa instead
  if ((kind === 'nap' || kind === 'swim') && spots.length === 0)
    return startBreak(ch, 'relax', world, durationSec);
  wakeUp(ch);
  // Prefer the nearest few spots so characters don't cross the whole office every time
  spots.sort(
    (a, b) =>
      Math.abs(a.col - ch.tileCol) +
      Math.abs(a.row - ch.tileRow) -
      (Math.abs(b.col - ch.tileCol) + Math.abs(b.row - ch.tileRow)),
  );
  const pool = spots.slice(0, 4);

  ch.breakKind = kind;
  ch.breakTimer = duration;
  ch.seatTimer = 0;

  for (const spot of pool.sort(() => Math.random() - 0.5)) {
    if (spot.col === ch.tileCol && spot.row === ch.tileRow) {
      ch.breakPhase = 'doing';
      ch.breakDir = spot.dir;
      ch.dir = spot.dir;
      ch.state = CharacterState.IDLE;
      ch.path = [];
      ch.breakBed = spot.bed ?? null;
      tuckIn(ch);
      return true;
    }
    const path = findPath(
      ch.tileCol,
      ch.tileRow,
      spot.col,
      spot.row,
      world.tileMap,
      world.blockedTiles,
    );
    if (path.length > 0) {
      ch.path = path;
      ch.moveProgress = 0;
      ch.state = CharacterState.WALK;
      ch.frame = 0;
      ch.frameTimer = 0;
      ch.breakPhase = 'going';
      ch.breakDir = spot.dir;
      ch.breakBed = spot.bed ?? null;
      return true;
    }
  }

  // No furniture for it (or unreachable): take the break right where we stand
  ch.breakPhase = 'doing';
  ch.breakDir = null;
  if (ch.state !== CharacterState.WALK) ch.state = CharacterState.IDLE;
  return true;
}

/**
 * Called BEFORE updateCharacter each frame. May start a spontaneous break in
 * place of a wander decision, and keeps a character in its break pose.
 */
export function preUpdateBreak(ch: Character, dt: number, world: BreakWorld): void {
  if (ch.isSubagent || ch.matrixEffect) return;

  if (ch.breakCooldown > 0) ch.breakCooldown -= dt;

  // Work comes first: drop the break the moment the agent becomes active
  if (ch.isActive) {
    if (ch.breakKind) clearBreak(ch);
    return;
  }

  // A group break that could not start yet (e.g. mid-step) — retry
  if (ch.pendingBreak && ch.breakPhase === null) {
    const kind = ch.pendingBreak;
    if (startBreak(ch, kind, world, GROUP_BREAK_SEC)) ch.pendingBreak = null;
    return;
  }

  if (ch.breakPhase === 'doing') {
    // Freeze the wander FSM while on break
    ch.wanderTimer = Math.max(ch.wanderTimer, 1);
    ch.state = CharacterState.IDLE;
    if (ch.breakDir !== null) ch.dir = ch.breakDir;
    ch.breakTimer -= dt;
    if (ch.breakTimer <= 0) {
      clearBreak(ch);
      ch.breakCooldown = BREAK_COOLDOWN_SEC;
      ch.wanderTimer = randomRange(1, 3);
    }
    return;
  }

  // Spontaneous break: hijack the wander decision that is about to fire
  if (
    ch.breakPhase === null &&
    ch.state === CharacterState.IDLE &&
    ch.breakCooldown <= 0 &&
    ch.wanderTimer - dt <= 0 &&
    Math.random() < BREAK_CHANCE
  ) {
    startBreak(ch, pickKind(), world);
  }
}

/** Called AFTER updateCharacter: notice arrival at the break spot. */
export function postUpdateBreak(ch: Character): void {
  if (ch.breakPhase !== 'going') return;
  if (ch.state === CharacterState.WALK && ch.path.length > 0) return;
  // The FSM finished the walk (it set IDLE, or sat at the seat as TYPE)
  ch.breakPhase = 'doing';
  ch.state = CharacterState.IDLE;
  if (ch.breakDir !== null) ch.dir = ch.breakDir;
  tuckIn(ch);
}

// ── Reminder schedule ────────────────────────────────────────────────────────

export interface Reminder {
  kind: BreakKind;
  /** Set for meal reminders: which meal (an i18n phrase key) */
  meal?: MsgKey;
}

const MEALS: Array<{ hour: number; name: MsgKey }> = [
  { hour: 8, name: 'breakfast' },
  { hour: 12, name: 'lunch' },
  { hour: 18, name: 'dinner' },
];
const FIRST_DRINK_HOUR = 9;
const LAST_DRINK_HOUR = 22;

/** The reminder due at this local minute, if any (fires at hh:00). */
export function reminderAt(date: Date): Reminder | null {
  if (date.getMinutes() !== 0) return null;
  const h = date.getHours();
  const meal = MEALS.find((m) => m.hour === h);
  if (meal) return { kind: 'eat', meal: meal.name };
  if (h >= FIRST_DRINK_HOUR && h <= LAST_DRINK_HOUR) return { kind: 'drink' };
  return null;
}

/** Key identifying a reminder slot, so each fires once. */
export function reminderKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
}
