import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateLadder, rungKey } from '../src/games/ladder/ladder.logic.js';
import { makeRng } from '../src/core/random.js';

test('generateLadder has the requested shape', () => {
  const l = generateLadder(4, 8, makeRng(3));
  assert.equal(l.columns, 4);
  assert.equal(l.rows, 8);
  assert.ok(l.rungs instanceof Set);
});

test('no two adjacent rungs share a row (no ambiguous crossing)', () => {
  const l = generateLadder(5, 12, makeRng(11));
  for (let row = 0; row < l.rows; row++) {
    for (let left = 0; left < l.columns - 2; left++) {
      const both = l.rungs.has(rungKey(row, left)) && l.rungs.has(rungKey(row, left + 1));
      assert.ok(!both, `adjacent rungs at row ${row}, left ${left}`);
    }
  }
});
