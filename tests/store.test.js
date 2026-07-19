import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, defaultState, loadPersisted, savePersisted, STORAGE_KEY } from '../src/core/store.js';

function fakeStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), _map: m };
}

test('createStore set merges and notifies subscribers', () => {
  const s = createStore({ a: 1, b: 2 });
  let seen = null;
  const unsub = s.subscribe(state => { seen = state; });
  s.set({ b: 9 });
  assert.deepEqual(s.get(), { a: 1, b: 9 });
  assert.deepEqual(seen, { a: 1, b: 9 });
  unsub();
  s.set({ a: 5 });
  assert.deepEqual(seen, { a: 1, b: 9 }); // 구독 해제 후 미통지
});

test('loadPersisted returns defaults when empty', () => {
  assert.deepEqual(loadPersisted(fakeStorage()), defaultState());
});

test('loadPersisted returns defaults on corrupt JSON', () => {
  assert.deepEqual(loadPersisted(fakeStorage({ [STORAGE_KEY]: '{not json' })), defaultState());
});

test('savePersisted then loadPersisted round-trips participants + settings', () => {
  const st = fakeStorage();
  const state = {
    participants: [{ id: 'p0', name: '민수', color: '#fff' }],
    settings: { theme: 'light', sound: false },
    ephemeral: 'should not persist',
  };
  savePersisted(state, st);
  const loaded = loadPersisted(st);
  assert.deepEqual(loaded.participants, state.participants);
  assert.deepEqual(loaded.settings, state.settings);
  assert.equal(loaded.ephemeral, undefined);
});
