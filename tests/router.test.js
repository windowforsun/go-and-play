import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHash } from '../src/core/router.js';

test('empty or root hash → home', () => {
  assert.deepEqual(parseHash(''), { route: 'home', param: null });
  assert.deepEqual(parseHash('#/'), { route: 'home', param: null });
  assert.deepEqual(parseHash('#'), { route: 'home', param: null });
});

test('game route with param', () => {
  assert.deepEqual(parseHash('#/game/ladder'), { route: 'game', param: 'ladder' });
});

test('game route without param', () => {
  assert.deepEqual(parseHash('#/game'), { route: 'game', param: null });
});
