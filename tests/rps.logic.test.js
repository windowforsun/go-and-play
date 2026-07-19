import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rpsResult, MOVES } from '../src/games/rps/rps.logic.js';

test('draws when moves are equal', () => {
  for (const m of MOVES) assert.equal(rpsResult(m, m), 'draw');
});

test('all winning combinations resolve to the correct side', () => {
  // a beats b
  assert.equal(rpsResult('rock', 'scissors'), 'a');
  assert.equal(rpsResult('paper', 'rock'), 'a');
  assert.equal(rpsResult('scissors', 'paper'), 'a');
  // b beats a (mirror)
  assert.equal(rpsResult('scissors', 'rock'), 'b');
  assert.equal(rpsResult('rock', 'paper'), 'b');
  assert.equal(rpsResult('paper', 'scissors'), 'b');
});
