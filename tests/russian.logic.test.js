import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadBullet, willFire, oddsText } from '../src/games/russian/russian.logic.js';
import { makeRng } from '../src/core/random.js';

test('loadBullet returns a chamber index within range', () => {
  const rng = makeRng(3);
  for (let i = 0; i < 100; i++) {
    const b = loadBullet(6, rng);
    assert.ok(b >= 0 && b < 6, `out of range: ${b}`);
  }
});

test('willFire only at the loaded chamber', () => {
  const bullet = 4;
  for (let p = 0; p < 6; p++) assert.equal(willFire(bullet, p), p === 4);
});

test('exactly one chamber fires across a full cycle', () => {
  const bullet = loadBullet(6, makeRng(11));
  let fires = 0;
  for (let p = 0; p < 6; p++) if (willFire(bullet, p)) fires++;
  assert.equal(fires, 1);
});

test('oddsText reflects remaining chambers', () => {
  assert.equal(oddsText(6), '1/6');
  assert.equal(oddsText(1), '1/1');
});
