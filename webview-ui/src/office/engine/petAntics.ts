// ─────────────────────────────────────────────────────────────────────────────
// Fork: pets have relationships. When two pets bump into each other:
//   rivals (dog × cat, elephant × panda) usually scuffle,
//   friends (panda × bunny, elephant × bunny) cuddle,
//   anyone else scuffles now and then.
// A scuffle is a cartoon one: a glare (💢), a rolling dust cloud with paws and
// stars, then they pop apart — the loser dizzy (💫) and running off, the
// winner smug (😤). The cloud is drawn by the renderer, the emoji by the
// PetAntics overlay.
// ─────────────────────────────────────────────────────────────────────────────

import { findPath, isWalkable } from '../layout/tileMap.js';
import type { Pet, TileType as TileTypeVal } from '../types.js';
import { Direction, PetState, TILE_SIZE } from '../types.js';
import { floorOfRow } from './building.js';
import type { Species } from './petPersonality.js';
import { speciesOf } from './petPersonality.js';

type Relation = 'rival' | 'friend' | 'neutral';

const GLARE_SEC = 0.9;
const BRAWL_SEC = 2.6;
const AFTER_SEC = 1.6;
const CUDDLE_SEC = 3.4;
/** Chance that a meeting turns into a scuffle / cuddle. */
const FIGHT_CHANCE: Record<Relation, number> = { rival: 0.7, neutral: 0.12, friend: 0 };
const CUDDLE_CHANCE = 0.65;
/** The same two pets meet again only after this long (whatever happened). */
const PAIR_COOLDOWN_SEC = 120;
/** Re-roll a meeting that came to nothing after this long. */
const MEET_COOLDOWN_SEC = 25;
/** Keep scuffles a treat, not constant. */
const GLOBAL_FIGHT_COOLDOWN_SEC = 40;
/** The loser runs at least this far (tiles). */
const FLEE_MIN_TILES = 5;

const RIVALS: Array<[Species, Species]> = [
  ['dog', 'cat'],
  ['elephant', 'panda'],
];
const FRIENDS: Array<[Species, Species]> = [
  ['panda', 'bunny'],
  ['elephant', 'bunny'],
  ['cat', 'cat'],
];

function relation(a: Species, b: Species): Relation {
  const is = (list: Array<[Species, Species]>) =>
    list.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  if (is(RIVALS)) return 'rival';
  if (is(FRIENDS)) return 'friend';
  return 'neutral';
}

export interface Antic {
  kind: 'fight' | 'cuddle';
  a: Pet;
  b: Pet;
  phase: 'glare' | 'brawl' | 'after' | 'cuddle';
  /** Seconds into the current phase */
  t: number;
  /** World px midpoint between the two (where the cloud rolls) */
  x: number;
  y: number;
  winner?: Pet;
  loser?: Pet;
  /** Varies the cloud's wobble per scuffle */
  seed: number;
}

const antics: Antic[] = [];
const pairCooldown = new Map<string, number>();
let fightCooldown = 0;

export function getAntics(): readonly Antic[] {
  return antics;
}

const pairKey = (a: Pet, b: Pet) => (a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`);
/** In a scene already, or napping on a bed (no scuffles in bed). */
const busy = (p: Pet) => !!p.perch || antics.some((x) => x.a === p || x.b === p);

function dirTowards(from: Pet, to: Pet): Direction {
  const dc = to.tileCol - from.tileCol;
  const dr = to.tileRow - from.tileRow;
  if (Math.abs(dc) >= Math.abs(dr)) return dc > 0 ? Direction.RIGHT : Direction.LEFT;
  return dr > 0 ? Direction.DOWN : Direction.UP;
}

/** Hold a pet still for the scene (overrides its own FSM this frame). */
function freeze(p: Pet): void {
  p.path = [];
  p.moveProgress = 0;
  p.x = p.tileCol * TILE_SIZE + TILE_SIZE / 2;
  p.y = p.tileRow * TILE_SIZE + TILE_SIZE / 2;
  p.state = PetState.IDLE;
  p.followTargetId = null;
  p.wanderTimer = Math.max(p.wanderTimer, 1);
  p.pendingPerch = null;
  p.pauseTimer = 0;
}

interface World {
  tileMap: TileTypeVal[][];
  blockedTiles: Set<string>;
  walkableTiles: Array<{ col: number; row: number }>;
}

/** Step `p` one tile away from `other`, if there is room. */
function popAway(p: Pet, other: Pet, world: World, taken: Set<string>): void {
  const dc = Math.sign(p.tileCol - other.tileCol);
  const dr = Math.sign(p.tileRow - other.tileRow);
  for (const [c, r] of [
    [p.tileCol + dc, p.tileRow + dr],
    [p.tileCol + dr, p.tileRow + dc],
    [p.tileCol - dr, p.tileRow - dc],
  ]) {
    if (!isWalkable(c, r, world.tileMap, world.blockedTiles) || taken.has(`${c},${r}`)) continue;
    p.tileCol = c;
    p.tileRow = r;
    p.x = c * TILE_SIZE + TILE_SIZE / 2;
    p.y = r * TILE_SIZE + TILE_SIZE / 2;
    return;
  }
}

function flee(p: Pet, world: World): void {
  const floor = floorOfRow(p.tileRow);
  for (let i = 0; i < 25; i++) {
    const t = world.walkableTiles[Math.floor(Math.random() * world.walkableTiles.length)];
    if (!t || floorOfRow(t.row) !== floor) continue;
    if (Math.abs(t.col - p.tileCol) + Math.abs(t.row - p.tileRow) < FLEE_MIN_TILES) continue;
    const path = findPath(p.tileCol, p.tileRow, t.col, t.row, world.tileMap, world.blockedTiles);
    if (path.length === 0) continue;
    p.path = path;
    p.moveProgress = 0;
    p.state = PetState.WALK;
    p.frame = 0;
    p.frameTimer = 0;
    return;
  }
}

/**
 * Advance running scenes and start new ones. Call after the pets' own FSM
 * each frame. `taken` = tiles people and pets stand on (for popping apart).
 */
export function updateAntics(pets: Pet[], dt: number, world: World, taken: Set<string>): void {
  fightCooldown = Math.max(0, fightCooldown - dt);
  for (const [k, v] of pairCooldown) {
    if (v - dt <= 0) pairCooldown.delete(k);
    else pairCooldown.set(k, v - dt);
  }

  // ── running scenes ──
  for (let i = antics.length - 1; i >= 0; i--) {
    const s = antics[i];
    s.t += dt;
    if (s.phase === 'glare' || s.phase === 'brawl' || s.phase === 'cuddle') {
      freeze(s.a);
      freeze(s.b);
      if (s.phase !== 'brawl') {
        s.a.dir = dirTowards(s.a, s.b);
        s.b.dir = dirTowards(s.b, s.a);
      }
    }
    if (s.phase === 'glare' && s.t >= GLARE_SEC) {
      s.phase = 'brawl';
      s.t = 0;
      s.a.hidden = true;
      s.b.hidden = true;
    } else if (s.phase === 'brawl' && s.t >= BRAWL_SEC) {
      s.phase = 'after';
      s.t = 0;
      s.a.hidden = false;
      s.b.hidden = false;
      const aWins = Math.random() < 0.5;
      s.winner = aWins ? s.a : s.b;
      s.loser = aWins ? s.b : s.a;
      popAway(s.a, s.b, world, taken);
      popAway(s.b, s.a, world, taken);
      s.loser.dir = dirTowards(s.loser, s.winner);
      s.winner.dir = dirTowards(s.winner, s.loser);
      flee(s.loser, world);
      s.winner.wanderTimer = 2;
    } else if (s.phase === 'after' && s.t >= AFTER_SEC) {
      antics.splice(i, 1);
    } else if (s.phase === 'cuddle' && s.t >= CUDDLE_SEC) {
      s.a.wanderTimer = 1 + Math.random() * 2;
      s.b.wanderTimer = 1 + Math.random() * 2;
      antics.splice(i, 1);
    }
  }

  // ── new meetings: two free pets on neighbouring tiles ──
  for (let i = 0; i < pets.length; i++) {
    const a = pets[i];
    if (busy(a)) continue;
    for (let j = i + 1; j < pets.length; j++) {
      const b = pets[j];
      if (busy(b)) continue;
      // bumped into each other: about a tile apart, on neighbouring tiles
      if (Math.hypot(a.x - b.x, a.y - b.y) > TILE_SIZE * 1.15) continue;
      if (Math.abs(a.tileCol - b.tileCol) + Math.abs(a.tileRow - b.tileRow) !== 1) continue;
      if (floorOfRow(a.tileRow) !== floorOfRow(b.tileRow)) continue;
      const key = pairKey(a, b);
      if (pairCooldown.has(key)) continue;
      const rel = relation(speciesOf(a), speciesOf(b));
      const x = (a.x + b.x) / 2;
      const y = (a.y + b.y) / 2;
      if (rel === 'friend' && Math.random() < CUDDLE_CHANCE) {
        antics.push({
          kind: 'cuddle',
          a,
          b,
          phase: 'cuddle',
          t: 0,
          x,
          y,
          seed: Math.random() * 100,
        });
        pairCooldown.set(key, PAIR_COOLDOWN_SEC);
      } else if (fightCooldown <= 0 && Math.random() < FIGHT_CHANCE[rel]) {
        antics.push({ kind: 'fight', a, b, phase: 'glare', t: 0, x, y, seed: Math.random() * 100 });
        pairCooldown.set(key, PAIR_COOLDOWN_SEC);
        fightCooldown = GLOBAL_FIGHT_COOLDOWN_SEC;
      } else {
        pairCooldown.set(key, MEET_COOLDOWN_SEC);
      }
    }
  }
}

/** Drop scenes whose pets are gone (layout rebuilt, pet removed). */
export function pruneAntics(pets: Pet[]): void {
  for (let i = antics.length - 1; i >= 0; i--) {
    const s = antics[i];
    if (!pets.includes(s.a) || !pets.includes(s.b)) {
      s.a.hidden = false;
      s.b.hidden = false;
      antics.splice(i, 1);
    }
  }
}
