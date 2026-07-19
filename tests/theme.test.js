import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toggleTheme, applyTheme } from '../src/core/theme.js';

test('toggleTheme flips value', () => {
  assert.equal(toggleTheme('dark'), 'light');
  assert.equal(toggleTheme('light'), 'dark');
});

test('applyTheme sets data-theme on a fake root', () => {
  const root = { setAttribute(k, v) { this[k] = v; } };
  applyTheme('light', root);
  assert.equal(root['data-theme'], 'light');
});
