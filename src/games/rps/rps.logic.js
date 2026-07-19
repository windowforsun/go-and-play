// 가위바위보 순수 로직 (DOM 없음).

export const MOVES = ['rock', 'paper', 'scissors'];
export const MOVE_EMOJI = { rock: '✊', paper: '✋', scissors: '✌️' };

const BEATS = { rock: 'scissors', paper: 'rock', scissors: 'paper' };

// 'draw' | 'a' | 'b'
export function rpsResult(a, b) {
  if (a === b) return 'draw';
  return BEATS[a] === b ? 'a' : 'b';
}
