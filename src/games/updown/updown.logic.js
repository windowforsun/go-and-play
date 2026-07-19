// 숫자 업다운(공포의 숫자) 순수 로직 (DOM 없음).

export function pickSecret(low, high, rng = Math.random) {
  return low + Math.floor(rng() * (high - low + 1));
}

// 추측 결과: 'hit'(정답) | 'up'(비밀이 더 큼) | 'down'(비밀이 더 작음)
export function judge(secret, guess) {
  if (guess === secret) return 'hit';
  return guess < secret ? 'up' : 'down';
}

// 결과에 따라 남은 범위를 좁힌다. 비밀 숫자는 항상 새 범위 안에 남는다.
export function narrow(range, guess, result) {
  if (result === 'up') return { low: guess + 1, high: range.high };
  if (result === 'down') return { low: range.low, high: guess - 1 };
  return range; // hit
}

// 유효한 추측인가(현재 범위 안).
export function isValidGuess(range, guess) {
  return Number.isInteger(guess) && guess >= range.low && guess <= range.high;
}
