import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickSecret, judge, narrow, isValidGuess } from '../src/games/updown/updown.logic.js';
import { makeRng } from '../src/core/random.js';

test('pickSecret stays within [low, high]', () => {
  const rng = makeRng(9);
  for (let i = 0; i < 200; i++) {
    const s = pickSecret(1, 100, rng);
    assert.ok(s >= 1 && s <= 100, `out of range: ${s}`);
  }
});

test('judge returns hit / up / down correctly', () => {
  assert.equal(judge(50, 50), 'hit');
  assert.equal(judge(50, 30), 'up');   // 비밀(50)이 더 큼
  assert.equal(judge(50, 80), 'down'); // 비밀(50)이 더 작음
});

test('narrow shrinks the range and keeps the secret inside', () => {
  const secret = 42;
  let range = { low: 1, high: 100 };
  const guesses = [50, 25, 40, 45, 43];
  for (const g of guesses) {
    const r = judge(secret, g);
    range = narrow(range, g, r);
    assert.ok(secret >= range.low && secret <= range.high, `secret ${secret} left range ${range.low}-${range.high}`);
    assert.ok(range.high - range.low < 100, 'range shrank');
  }
});

test('isValidGuess enforces integer within range', () => {
  const range = { low: 10, high: 20 };
  assert.equal(isValidGuess(range, 15), true);
  assert.equal(isValidGuess(range, 9), false);
  assert.equal(isValidGuess(range, 21), false);
  assert.equal(isValidGuess(range, 12.5), false);
});
