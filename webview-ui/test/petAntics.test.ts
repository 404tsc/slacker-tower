import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAntics, pruneAntics, updateAntics } from '../src/office/engine/petAntics.js';
import { createPet } from '../src/office/engine/petEntity.js';
import { getWalkableTiles } from '../src/office/layout/tileMap.js';
import type { Pet } from '../src/office/types.js';
import { TileType } from '../src/office/types.js';

const tileMap: TileType[][] = Array.from({ length: 10 }, () =>
  new Array<TileType>(14).fill(TileType.FLOOR_1),
);
const world = {
  tileMap,
  blockedTiles: new Set<string>(),
  walkableTiles: getWalkableTiles(tileMap, new Set()),
};

function pet(id: string, name: string, col: number): Pet {
  const p = createPet(id, 0, col, 5);
  p.name = name;
  return p;
}

function run(pets: Pet[], seconds: number, onFrame?: () => void): void {
  for (let t = 0; t < seconds; t += 0.05) {
    updateAntics(pets, 0.05, world, new Set());
    onFrame?.();
  }
}

describe('pet antics', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    pruneAntics([]);
  });

  it('rivals that meet have a scuffle: glare, cloud, then the loser runs off', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const dog = pet('d', 'Claudio', 6);
    const cat = pet('c', 'Gitcat', 7);
    run([dog, cat], 0.05);
    expect(getAntics()).toHaveLength(1);
    expect(getAntics()[0].phase).toBe('glare');

    let sawCloud = false;
    run([dog, cat], 3.6, () => {
      if (getAntics()[0]?.phase === 'brawl') {
        sawCloud = true;
        expect(dog.hidden && cat.hidden).toBe(true);
      }
    });
    expect(sawCloud).toBe(true);
    expect(dog.hidden).toBe(false);
    expect(cat.hidden).toBe(false);
    const s = getAntics()[0];
    expect(s.phase).toBe('after');
    expect(s.loser?.path.length).toBeGreaterThan(0);

    run([dog, cat], 2);
    expect(getAntics()).toHaveLength(0);
  });

  it('friends cuddle instead of fighting', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const panda = pet('p', '熊猫', 3);
    const bunny = pet('b', '小兔子', 4);
    run([panda, bunny], 0.05);
    expect(getAntics()[0]?.kind).toBe('cuddle');
    run([panda, bunny], 4);
    expect(getAntics()).toHaveLength(0);
  });

  it('the same pair does not start again right away', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const dog = pet('d2', 'Claudio', 6);
    const cat = pet('c2', 'Gitcat', 7);
    run([dog, cat], 6);
    dog.tileCol = 6;
    cat.tileCol = 7;
    dog.path = [];
    cat.path = [];
    run([dog, cat], 0.1);
    expect(getAntics()).toHaveLength(0);
  });
});
