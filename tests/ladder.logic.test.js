import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateLadder, rungKey, traverse, computeAssignments, tracePath } from '../src/games/ladder/ladder.logic.js';
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

test('traverse follows a single known rung', () => {
  // 열 3개, 행 1개, (row0,left0) 가로줄만 → 0↔1 스왑, 2는 그대로
  const ladder = { columns: 3, rows: 1, rungs: new Set([rungKey(0, 0)]) };
  assert.equal(traverse(ladder, 0), 1);
  assert.equal(traverse(ladder, 1), 0);
  assert.equal(traverse(ladder, 2), 2);
});

test('tracePath returns rows+1 columns ending at traverse()', () => {
  const l = generateLadder(5, 10, makeRng(7));
  for (let c = 0; c < l.columns; c++) {
    const seq = tracePath(l, c);
    assert.equal(seq.length, l.rows + 1);
    assert.equal(seq[0], c);
    assert.equal(seq[seq.length - 1], traverse(l, c)); // 단일 출처 일치
  }
});

test('computeAssignments is always a bijection (permutation)', () => {
  for (const seed of [1, 2, 3, 42, 100]) {
    const l = generateLadder(6, 15, makeRng(seed));
    const res = computeAssignments(l);
    assert.equal(res.length, 6);
    assert.deepEqual([...res].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
  }
});
