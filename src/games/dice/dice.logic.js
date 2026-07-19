// 주사위 순수 로직 (DOM 없음).

export function rollDice(n, rng = Math.random) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(1 + Math.floor(rng() * 6));
  return out;
}

// 값 배열 → 값 내림차순 정렬 + 표준 경쟁 순위(동점은 같은 등수). [{index, value, rank}]
export function rankByValue(values) {
  const order = values
    .map((v, i) => ({ index: i, value: v }))
    .sort((a, b) => b.value - a.value || a.index - b.index);
  let rank = 1;
  return order.map((o, k) => {
    if (k > 0 && o.value !== order[k - 1].value) rank = k + 1;
    return { index: o.index, value: o.value, rank };
  });
}
