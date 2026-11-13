import assert from 'node:assert/strict';

import { test } from 'vitest';

import { postUpdateBreak, preUpdateBreak, reminderAt, startBreak } from '../src/office/engine/breaks.js';
import { createCharacter, updateCharacter } from '../src/office/engine/characters.js';
import { getWalkableTiles } from '../src/office/layout/tileMap.js';
import type { PlacedFurniture } from '../src/office/types.js';
import { CharacterState, TileType } from '../src/office/types.js';

const SIZE = 8;
const tileMap: TileType[][] = Array.from({ length: SIZE }, () =>
  Array.from({ length: SIZE }, () => TileType.FLOOR_1),
);
const furniture: PlacedFurniture[] = [{ uid: 'c1', type: 'COFFEE', col: 6, row: 6 }];
const blockedTiles = new Set(['6,6']);
const world = { furniture, tileMap, blockedTiles };
const walkable = getWalkableTiles(tileMap, blockedTiles);

function step(ch: ReturnType<typeof createCharacter>, seconds: number) {
  const dt = 1 / 30;
  for (let t = 0; t < seconds; t += dt) {
    preUpdateBreak(ch, dt, world);
    updateCharacter(ch, dt, walkable, new Map(), tileMap, blockedTiles);
    postUpdateBreak(ch);
  }
}

test('an idle character walks to the coffee and drinks next to it', () => {
  const ch = createCharacter(1, 0, null, null);
  ch.isActive = false;
  ch.state = CharacterState.IDLE;
  assert.ok(startBreak(ch, 'drink', world, 5));
  assert.equal(ch.breakPhase, 'going');
  step(ch, 10);
  // Either still drinking or just finished; it must have stood next to the coffee
  assert.ok(Math.abs(ch.tileCol - 6) + Math.abs(ch.tileRow - 6) <= 1 || ch.breakPhase === null);
});

test('the break ends after its duration and becoming active cancels it', () => {
  const ch = createCharacter(2, 0, null, null);
  ch.isActive = false;
  ch.state = CharacterState.IDLE;
  startBreak(ch, 'nap', world, 1);
  step(ch, 15);
  assert.equal(ch.breakPhase, null);

  startBreak(ch, 'eat', world, 30);
  ch.isActive = true;
  step(ch, 0.1);
  assert.equal(ch.breakKind, null);
});

test('a nap is taken in a free bed of the bedroom, and waking up leaves the bed', () => {
  // 8x8 map: the right half (cols 4-7) is the 卧室 with two beds
  const beds: PlacedFurniture[] = [
    { uid: 'b1', type: 'BED_BLUE', col: 5, row: 1 },
    { uid: 'b2', type: 'BED_PINK', col: 5, row: 5 },
    { uid: 's1', type: 'SOFA_FRONT', col: 1, row: 1 },
  ];
  const blocked = new Set(['5,1', '5,5', '1,1']);
  const areaTiles = Array.from({ length: SIZE * SIZE }, (_, i) => (i % SIZE >= 4 ? '卧室' : '休息区'));
  const a = createCharacter(3, 0, null, null);
  const b = createCharacter(4, 0, null, null);
  const c = createCharacter(5, 0, null, null);
  const chars = [a, b, c];
  const bedWorld = { furniture: beds, tileMap, blockedTiles: blocked, areaTiles, cols: SIZE, characters: chars };
  const walk = getWalkableTiles(tileMap, blocked);
  for (const ch of chars) {
    ch.isActive = false;
    ch.state = CharacterState.IDLE;
  }
  const run = (ch: ReturnType<typeof createCharacter>, seconds: number) => {
    const dt = 1 / 30;
    for (let t = 0; t < seconds; t += dt) {
      preUpdateBreak(ch, dt, bedWorld);
      updateCharacter(ch, dt, walk, new Map(), tileMap, blocked);
      postUpdateBreak(ch);
    }
  };
  assert.ok(startBreak(a, 'nap', bedWorld, 60));
  run(a, 8);
  assert.equal(a.breakPhase, 'doing');
  assert.ok(a.sleep, 'a is in bed');
  assert.equal(a.y, a.sleep!.y);

  assert.ok(startBreak(b, 'nap', bedWorld, 60));
  run(b, 8);
  assert.ok(b.sleep);
  assert.notEqual(b.sleep!.bedUid, a.sleep!.bedUid, 'one sleeper per bed');

  // both beds taken: the third one lounges in the 休息区 instead
  assert.ok(startBreak(c, 'nap', bedWorld, 60));
  assert.equal(c.breakKind, 'relax');

  a.isActive = true;
  run(a, 0.1);
  assert.equal(a.sleep, null);
  assert.equal(a.x, a.tileCol * 16 + 8);
  assert.equal(a.y, a.tileRow * 16 + 8);
});

test('reminders: meals at 8/12/18, water on other full hours 9–22', () => {
  assert.equal(reminderAt(new Date(2026, 10, 9, 12, 0))?.kind, 'eat');
  assert.equal(reminderAt(new Date(2026, 10, 9, 15, 0))?.kind, 'drink');
  assert.equal(reminderAt(new Date(2026, 10, 9, 15, 1)), null);
  assert.equal(reminderAt(new Date(2026, 10, 9, 3, 0)), null);
});
