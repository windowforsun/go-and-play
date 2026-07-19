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

// 경로의 단일 출처: 각 행을 지나며 도달하는 열 순서(길이 rows+1).
export function tracePath(ladder, startCol) {
  const seq = [startCol];
  let col = startCol;
  for (let row = 0; row < ladder.rows; row++) {
    if (ladder.rungs.has(rungKey(row, col - 1))) col -= 1;
    else if (ladder.rungs.has(rungKey(row, col))) col += 1;
    seq.push(col);
  }
  return seq;
}

export function traverse(ladder, startCol) {
  const seq = tracePath(ladder, startCol);
  return seq[seq.length - 1];
}

export function computeAssignments(ladder) {
  const result = [];
  for (let c = 0; c < ladder.columns; c++) result[c] = traverse(ladder, c);
  return result;
}
