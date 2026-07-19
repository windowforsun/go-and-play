import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng, shuffle, pick, randomInt } from '../src/core/random.js';

test('makeRng is deterministic for the same seed', () => {
  const a = makeRng(42), b = makeRng(42);
  const seqA = [a(), a(), a()], seqB = [b(), b(), b()];
  assert.deepEqual(seqA, seqB);
  seqA.forEach(n => { assert.ok(n >= 0 && n < 1); });
});

test('different seeds diverge', () => {
  const a = makeRng(1), b = makeRng(2);
  assert.notEqual(a(), b());
});

test('shuffle returns a permutation without mutating input', () => {
  const input = [1, 2, 3, 4, 5];
  const out = shuffle(input, makeRng(7));
  assert.deepEqual(input, [1, 2, 3, 4, 5]);            // 불변
  assert.deepEqual([...out].sort((x, y) => x - y), input); // 같은 원소 집합
  assert.equal(out.length, 5);
});

test('randomInt stays within inclusive bounds', () => {
  const rng = makeRng(99);
  for (let i = 0; i < 200; i++) {
    const n = randomInt(3, 6, rng);
    assert.ok(n >= 3 && n <= 6, `out of range: ${n}`);
  }
});

test('pick returns an element of the array', () => {
  const arr = ['a', 'b', 'c'];
  assert.ok(arr.includes(pick(arr, makeRng(5))));
});
