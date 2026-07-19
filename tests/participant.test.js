import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeName, participantColor, makeParticipant, canStart, PALETTE } from '../src/ui/participant-editor.js';

test('normalizeName trims whitespace', () => {
  assert.equal(normalizeName('  민수  '), '민수');
});

test('participantColor cycles through the palette', () => {
  assert.equal(participantColor(0), PALETTE[0]);
  assert.equal(participantColor(PALETTE.length), PALETTE[0]);
});

test('makeParticipant builds id/name/color', () => {
  const p = makeParticipant('  지현 ', 1);
  assert.equal(p.id, 'p1');
  assert.equal(p.name, '지현');
  assert.equal(p.color, PALETTE[1]);
});

test('canStart requires at least two participants', () => {
  assert.equal(canStart([{}]), false);
  assert.equal(canStart([{}, {}]), true);
});
