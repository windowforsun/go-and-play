import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rollDice, rankByValue } from '../src/games/dice/dice.logic.js';
import { makeRng } from '../src/core/random.js';

test('rollDice returns n values each in 1..6', () => {
  const vals = rollDice(20, makeRng(4));
  assert.equal(vals.length, 20);
  vals.forEach(v => assert.ok(v >= 1 && v <= 6, `out of range: ${v}`));
});

test('rankByValue sorts by value desc, ties share a rank (standard competition)', () => {
  const r = rankByValue([3, 6, 6, 1]);
  // 인덱스 1,2 = 6 (공동 1등), 인덱스 0 = 3 (3등), 인덱스 3 = 1 (4등)
  assert.deepEqual(r.map(x => x.index), [1, 2, 0, 3]);
  assert.deepEqual(r.map(x => x.rank), [1, 1, 3, 4]);
});

test('rankByValue covers every participant exactly once', () => {
  const r = rankByValue([2, 5, 5, 5, 1]);
  assert.deepEqual([...r.map(x => x.index)].sort((a, b) => a - b), [0, 1, 2, 3, 4]);
  assert.deepEqual(r.map(x => x.rank), [1, 1, 1, 4, 5]);
});
