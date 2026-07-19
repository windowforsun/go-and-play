export function rungKey(row, leftCol) { return `${row},${leftCol}`; }

// columns 세로줄, rows 행. 각 행에서 인접 가로줄이 겹치지 않게 배치.
export function generateLadder(columns, rows, rng = Math.random) {
  const rungs = new Set();
  for (let row = 0; row < rows; row++) {
    for (let left = 0; left < columns - 1; left++) {
      if (rungs.has(rungKey(row, left - 1))) continue; // 왼쪽에 이미 가로줄 → 겹침 방지
      if (rng() < 0.5) rungs.add(rungKey(row, left));
    }
  }
  return { columns, rows, rungs };
}
