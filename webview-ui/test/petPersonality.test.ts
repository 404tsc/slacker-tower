import { afterEach, describe, expect, it, vi } from 'vitest';

import { createPet, updatePet } from '../src/office/engine/petEntity.js';
import type { PetFavorites } from '../src/office/engine/petPersonality.js';
import { personalityOf, speciesOf } from '../src/office/engine/petPersonality.js';
import { getWalkableTiles } from '../src/office/layout/tileMap.js';
import type { Pet } from '../src/office/types.js';
import { PetState, TileType } from '../src/office/types.js';

const tileMap: TileType[][] = Array.from({ length: 12 }, () =>
  new Array<TileType>(16).fill(TileType.FLOOR_1),
);
const blocked = new Set<string>();
const walkable = getWalkableTiles(tileMap, blocked);

function pet(name: string, col = 2, row = 2): Pet {
  const p = createPet(name, 0, col, row);
  p.name = name;
  return p;
}

describe('pet personalities', () => {
  afterEach(() => vi.restoreAllMocks());

  it('knows each pet by name (熊猫 is a panda, not a cat)', () => {
    expect(speciesOf(pet('熊猫'))).toBe('panda');
    expect(speciesOf(pet('Gitcat'))).toBe('cat');
    expect(speciesOf(pet('Claudio'))).toBe('dog');
    expect(speciesOf(pet('小象'))).toBe('elephant');
    expect(speciesOf(pet('小兔子'))).toBe('bunny');
  });

  it('the dog is quick and loves people, the panda is slow and lazy', () => {
    const dog = personalityOf(pet('Claudio'));
    const panda = personalityOf(pet('熊猫'));
    const elephant = personalityOf(pet('小象'));
    expect(dog.speed).toBeGreaterThan(panda.speed);
    expect(dog.speed).toBeGreaterThan(elephant.speed);
    expect(dog.followChance).toBeGreaterThan(panda.followChance);
    expect(panda.pauseMin).toBeGreaterThan(dog.pauseMax);
  });

  it('walks at its own speed', () => {
    const run = (name: string) => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99); // no follow, no favourite, no stops
      const p = pet(name, 1, 5);
      p.wanderTimer = 0;
      p.state = PetState.WALK;
      p.path = Array.from({ length: 12 }, (_, i) => ({ col: 2 + i, row: 5 }));
      for (let t = 0; t < 3; t += 0.05) updatePet(p, 0.05, walkable, new Map(), tileMap, blocked);
      vi.restoreAllMocks();
      return p.tileCol;
    };
    expect(run('Claudio')).toBeGreaterThan(run('小象'));
  });

  it('the Maine Coon is a slow gentle giant, the Dragon Li a quick hunter', () => {
    const maine = personalityOf(pet('缅因猫'));
    const lihua = personalityOf(pet('狸花猫'));
    expect(speciesOf(pet('缅因猫'))).toBe('cat');
    expect(speciesOf(pet('狸花猫'))).toBe('cat');
    expect(lihua.speed).toBeGreaterThan(maine.speed);
    expect(maine.followChance).toBeGreaterThan(lihua.followChance);
  });

  it('only one cat curls up on each spot', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.3);
    const perch = { x: 40, y: 40, zY: 50 };
    const favorites: PetFavorites = new Map([['cat', [{ col: 2, row: 2, perch }]]]);
    const a = pet('Gitcat', 2, 2);
    const b = pet('狸花猫', 2, 2);
    a.wanderTimer = 0;
    b.wanderTimer = 0;
    updatePet(a, 0.05, walkable, new Map(), tileMap, blocked, favorites);
    updatePet(b, 0.05, walkable, new Map(), tileMap, blocked, favorites);
    expect(a.perch).toEqual(perch);
    expect(b.perch ?? null).toBeNull();
  });

  it('the cat walks to a bed and curls up on it', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.3); // no follow (0.12), favourite (0.55) yes
    const cat = pet('Gitcat', 2, 2);
    cat.wanderTimer = 0;
    const perch = { x: 160, y: 120, zY: 150 };
    const favorites: PetFavorites = new Map([['cat', [{ col: 9, row: 7, perch }]]]);
    for (let t = 0; t < 20 && !cat.perch; t += 0.05)
      updatePet(cat, 0.05, walkable, new Map(), tileMap, blocked, favorites);
    expect(cat.perch).toEqual(perch);
    expect(cat.x).toBe(perch.x);
    expect(cat.tileCol).toBe(9);
  });
});
