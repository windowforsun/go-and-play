// 룰렛 순수 로직 (DOM 없음). 원판을 시계방향으로 회전, 포인터는 상단(12시).
// 칸 i는 [i*slice, (i+1)*slice) 각도를 차지하고 중심은 i*slice + slice/2.

export function sliceAngle(n) { return 360 / n; }

// 승자 칸의 중심이 상단 포인터에 오도록 하는 회전각(도). extraSpins 바퀴를 더 돈다.
export function spinToIndex(winner, n, extraSpins = 5) {
  const slice = 360 / n;
  const target = (360 - (winner * slice + slice / 2)) % 360;
  return extraSpins * 360 + (target + 360) % 360;
}

// 최종 회전각 deg에서 상단 포인터 아래에 오는 칸 인덱스 (역산 · 검증용).
export function indexAtPointer(deg, n) {
  const slice = 360 / n;
  const norm = ((deg % 360) + 360) % 360;
  const at = (360 - norm) % 360; // 회전 전 어느 각도가 상단에 왔는지
  return Math.floor(at / slice) % n;
}
