// 러시안 룰렛 순수 로직 (DOM 없음). chambers개 약실 중 1개에 탄환.

export function loadBullet(chambers, rng = Math.random) {
  return Math.floor(rng() * chambers);
}

// 현재 약실 position에서 방아쇠를 당기면 발사되는가.
export function willFire(bulletChamber, position) {
  return position === bulletChamber;
}

// 남은 약실 수로 이번 발사 확률 문자열.
export function oddsText(chambersLeft) {
  return `1/${chambersLeft}`;
}
