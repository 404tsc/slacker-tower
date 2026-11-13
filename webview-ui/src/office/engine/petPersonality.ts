// ─────────────────────────────────────────────────────────────────────────────
// Fork: every kind of pet has its own personality — how fast it walks, how
// long it dawdles, how much it likes following people, where it likes to go,
// and how it walks (the dog sniffs around, the bunny hops, the panda takes
// its time). The cat climbs onto beds for a nap.
// ─────────────────────────────────────────────────────────────────────────────

import { getCatalogEntry } from '../layout/furnitureCatalog.js';
import { isWalkable } from '../layout/tileMap.js';
import type { OfficeLayout, Pet, TileType as TileTypeVal } from '../types.js';
import { TILE_SIZE } from '../types.js';

export type Species = 'dog' | 'cat' | 'bunny' | 'elephant' | 'panda' | 'other';

export function speciesOf(pet: Pet): Species {
  const n = pet.name.toLowerCase();
  // panda first: 熊猫 contains 猫 ("cat")
  if (n.includes('panda') || n.includes('熊猫')) return 'panda';
  if (n.includes('claudio') || n.includes('dog') || n.includes('狗')) return 'dog';
  if (n.includes('cat') || n.includes('猫')) return 'cat';
  if (n.includes('bunny') || n.includes('兔')) return 'bunny';
  if (n.includes('elephant') || n.includes('象')) return 'elephant';
  return 'other';
}

export interface Personality {
  /** Walking speed relative to the default */
  speed: number;
  /** Seconds of dawdling between outings */
  pauseMin: number;
  pauseMax: number;
  /** Chance to tag along with a nearby person when an outing starts */
  followChance: number;
  followRadius: number;
  /** Chance an outing goes to a favourite place */
  favoriteChance: number;
  /** Area-label substrings of favourite places */
  favoriteRooms: string[];
  /** Chance to stop on arriving at a tile mid-walk (sniff, hop, look) */
  stopChance: number;
  stopMin: number;
  stopMax: number;
  /** Chance a random outing stays on the current floor */
  sameFloor: number;
  /** Bounces while walking (the bunny) */
  hops?: boolean;
}

const DEFAULT: Personality = {
  speed: 1,
  pauseMin: 3,
  pauseMax: 15,
  followChance: 0.3,
  followRadius: 3,
  favoriteChance: 0,
  favoriteRooms: [],
  stopChance: 0.05,
  stopMin: 0.4,
  stopMax: 0.9,
  sameFloor: 0.75,
};

const PERSONALITIES: Record<Species, Personality> = {
  dog: {
    ...DEFAULT,
    speed: 1.25,
    pauseMin: 2,
    pauseMax: 7,
    followChance: 0.7,
    followRadius: 6,
    favoriteChance: 0.35,
    favoriteRooms: ['市场部', '设计部', '技术部'],
    stopChance: 0.14,
    stopMin: 0.4,
    stopMax: 1.0,
    sameFloor: 0.8,
  },
  cat: {
    ...DEFAULT,
    speed: 1.1,
    pauseMin: 6,
    pauseMax: 18,
    followChance: 0.12,
    favoriteChance: 0.55,
    favoriteRooms: ['卧室', '猫舍'],
    stopChance: 0.06,
    sameFloor: 0.6,
  },
  bunny: {
    ...DEFAULT,
    speed: 1.05,
    pauseMin: 1.5,
    pauseMax: 6,
    followChance: 0.2,
    favoriteChance: 0.4,
    favoriteRooms: ['茶水间'],
    stopChance: 0.45,
    stopMin: 0.15,
    stopMax: 0.4,
    hops: true,
  },
  elephant: {
    ...DEFAULT,
    speed: 0.6,
    pauseMin: 4,
    pauseMax: 12,
    followChance: 0.25,
    favoriteChance: 0.5,
    favoriteRooms: ['泳池'],
    stopChance: 0.08,
    stopMin: 0.6,
    stopMax: 1.2,
  },
  panda: {
    ...DEFAULT,
    speed: 0.7,
    pauseMin: 12,
    pauseMax: 32,
    followChance: 0.1,
    favoriteChance: 0.5,
    favoriteRooms: ['休息区', '卧室'],
    stopChance: 0.12,
    stopMin: 0.8,
    stopMax: 2,
  },
  other: DEFAULT,
};

/** The Maine Coon: a gentle, sociable giant. */
const MAINE_COON: Personality = {
  ...PERSONALITIES.cat,
  speed: 0.9,
  pauseMin: 6,
  pauseMax: 16,
  followChance: 0.35,
  followRadius: 4,
  favoriteChance: 0.5,
};
/** The Dragon Li (狸花猫): a quick, restless little hunter. */
const DRAGON_LI: Personality = {
  ...PERSONALITIES.cat,
  speed: 1.35,
  pauseMin: 2.5,
  pauseMax: 9,
  followChance: 0.15,
  favoriteChance: 0.45,
  stopChance: 0.14,
  stopMin: 0.3,
  stopMax: 0.8,
};

export function personalityOf(pet: Pet): Personality {
  const species = speciesOf(pet);
  if (species === 'cat') {
    const n = pet.name.toLowerCase();
    if (n.includes('缅因') || n.includes('maine')) return MAINE_COON;
    if (n.includes('狸花') || n.includes('lihua') || n.includes('dragon')) return DRAGON_LI;
  }
  return PERSONALITIES[species];
}

/** Perches someone is curled up on (one pet per perch). */
export const takenPerches = new Set<object>();

/** Where a pet can go: a tile, and for beds a spot on top to curl up on. */
export interface FavoriteSpot {
  col: number;
  row: number;
  perch?: { x: number; y: number; zY: number };
}

/** Favourite spots per species, from the layout's rooms and furniture. */
export type PetFavorites = Map<Species, FavoriteSpot[]>;

export function buildPetFavorites(
  layout: OfficeLayout,
  tileMap: TileTypeVal[][],
  blockedTiles: Set<string>,
): PetFavorites {
  const out: PetFavorites = new Map();
  const areaAt = (c: number, r: number) => layout.areaTiles?.[r * layout.cols + c] ?? null;
  for (const species of Object.keys(PERSONALITIES) as Species[]) {
    const rooms = PERSONALITIES[species].favoriteRooms;
    if (rooms.length === 0) continue;
    const spots: FavoriteSpot[] = [];
    for (let r = 0; r < layout.rows; r++)
      for (let c = 0; c < layout.cols; c++) {
        const a = areaAt(c, r);
        if (a && rooms.some((room) => a.includes(room)) && isWalkable(c, r, tileMap, blockedTiles))
          spots.push({ col: c, row: r });
      }
    out.set(species, spots);
  }

  // Cats curl up ON things: beds (at the foot), cat beds, the cat tree's
  // platforms. Walk up next to it, then hop on.
  const perches: FavoriteSpot[] = [];
  const addPerch = (
    perch: { x: number; y: number; zY: number },
    approach: Array<[number, number]>,
  ) => {
    for (const [c, r] of approach) {
      if (isWalkable(c, r, tileMap, blockedTiles)) {
        perches.push({ col: c, row: r, perch });
        return;
      }
    }
  };
  for (const item of layout.furniture) {
    const type = item.type.split(':')[0];
    const e = getCatalogEntry(item.type);
    const { col, row } = item;
    if (type.startsWith('BED_')) {
      const w = e?.footprintW ?? 2;
      const h = e?.footprintH ?? 3;
      addPerch(
        {
          x: (col + w / 2) * TILE_SIZE,
          y: (row + h - 0.55) * TILE_SIZE,
          zY: (row + h) * TILE_SIZE + 0.6,
        },
        [
          [col, row + h],
          [col + w - 1, row + h],
          [col - 1, row + h - 1],
          [col + w, row + h - 1],
        ],
      );
    } else if (type.startsWith('CAT_BED')) {
      addPerch(
        { x: (col + 0.5) * TILE_SIZE, y: row * TILE_SIZE + 12, zY: (row + 1) * TILE_SIZE + 0.6 },
        [
          [col, row + 1],
          [col - 1, row],
          [col + 1, row],
          [col, row - 1],
        ],
      );
    } else if (type === 'CAT_TREE') {
      // sprite is 2x3 drawn from `row`; platforms at y≈11 (top) and y≈23 (middle)
      const zY = (row + 3) * TILE_SIZE + 0.6;
      const approach: Array<[number, number]> = [
        [col, row + 3],
        [col + 1, row + 3],
        [col + 2, row + 2],
        [col - 1, row + 2],
      ];
      addPerch({ x: col * TILE_SIZE + 12, y: row * TILE_SIZE + 11, zY }, approach);
      addPerch({ x: col * TILE_SIZE + 22, y: row * TILE_SIZE + 23, zY: zY + 0.1 }, approach);
    }
  }
  if (perches.length > 0) {
    out.set('cat', [...(out.get('cat') ?? []), ...perches]);
  }
  return out;
}
