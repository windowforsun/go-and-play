import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sliceAngle, spinToIndex, indexAtPointer } from '../src/games/roulette/roulette.logic.js';

test('sliceAngle divides the circle', () => {
  assert.equal(sliceAngle(4), 90);
  assert.equal(sliceAngle(8), 45);
});

test('spinToIndex includes the requested extra full spins', () => {
  const deg = spinToIndex(0, 6, 5);
  assert.ok(deg >= 5 * 360, 'at least 5 full turns');
  assert.ok(deg < 6 * 360, 'less than 6 full turns');
});

test('indexAtPointer(spinToIndex(w)) === w for every slot and size', () => {
  for (const n of [2, 3, 4, 6, 8, 9, 12]) {
    for (let w = 0; w < n; w++) {
      const deg = spinToIndex(w, n, 3);
      assert.equal(indexAtPointer(deg, n), w, `n=${n} w=${w} deg=${deg}`);
    }
  }
});
