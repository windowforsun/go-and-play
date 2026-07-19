import { rungKey, tracePath } from './ladder.logic.js';

const COL_GAP = 70, TOP = 20, ROW_GAP = 22, PAD = 20;

function xOf(col) { return PAD + col * COL_GAP; }
// 행 y좌표: 세로줄 범위(TOP ~ TOP+rows*ROW_GAP) 안쪽에 균등 배치
function yOf(row) { return TOP + (row + 0.5) * ROW_GAP; }

export function playLadder(container, ctx, data) {
  const { participants, results, ladder, assignments } = data;
  const n = participants.length;
  const width = PAD * 2 + (n - 1) * COL_GAP;
  const height = TOP * 2 + ladder.rows * ROW_GAP;

  ctx.mascot.setState('thinking');

  const stage = document.createElement('div');
  stage.className = 'ladder-stage';

  // 상단 참가자 라벨
  const top = document.createElement('div');
  top.className = 'ladder-labels';
  participants.forEach(p => {
    const s = document.createElement('span'); s.textContent = p.name; s.style.background = p.color; top.appendChild(s);
  });

  // SVG
  const wrap = document.createElement('div');
  wrap.className = 'ladder-svg-wrap';
  wrap.style.width = width + 'px'; wrap.style.height = height + 'px';
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', width); svg.setAttribute('height', height);

  // 세로줄
  for (let c = 0; c < n; c++) {
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', xOf(c)); line.setAttribute('x2', xOf(c));
    line.setAttribute('y1', TOP); line.setAttribute('y2', height - TOP);
    line.style.stroke = 'var(--rung-track)'; // CSS 속성으로 설정해야 var()가 해석됨(프레젠테이션 속성 X)
    line.setAttribute('stroke-width', '6');
    line.setAttribute('stroke-linecap', 'round');
    svg.appendChild(line);
  }
  // 가로줄
  for (let row = 0; row < ladder.rows; row++) {
    for (let left = 0; left < n - 1; left++) {
      if (!ladder.rungs.has(rungKey(row, left))) continue;
      const y = yOf(row);
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', xOf(left)); line.setAttribute('x2', xOf(left + 1));
      line.setAttribute('y1', y); line.setAttribute('y2', y);
      line.setAttribute('stroke', participants[left].color); line.setAttribute('stroke-width', '6');
      line.setAttribute('stroke-linecap', 'round');
      svg.appendChild(line);
    }
  }
  wrap.appendChild(svg);

  // 토큰(한 참가자씩 순차 애니메이션)
  const token = document.createElement('div');
  token.className = 'ladder-token';
  wrap.appendChild(token);

  // 하단 결과 라벨
  const bottom = document.createElement('div');
  bottom.className = 'ladder-labels';
  results.forEach(r => { const s = document.createElement('span'); s.textContent = r; s.style.background = 'var(--purple)'; bottom.appendChild(s); });

  const actions = document.createElement('div');
  actions.className = 'ladder-actions';
  const skip = document.createElement('button');
  skip.className = 'jelly-btn secondary'; skip.textContent = '결과 바로 보기';
  actions.appendChild(skip);

  stage.append(top, wrap, bottom, actions);
  container.innerHTML = '';
  container.appendChild(stage);

  // 경로 좌표 계산: 참가자 0부터 순차로 내려가는 애니메이션
  // 경로는 ladder.logic의 tracePath 단일 출처를 사용(assignments와 규칙 공유 → 도착 열 항상 일치)
  function pathPoints(startCol) {
    const seq = tracePath(ladder, startCol);
    const pts = [{ x: xOf(seq[0]), y: TOP }];
    for (let row = 0; row < ladder.rows; row++) {
      const y = yOf(row);
      pts.push({ x: xOf(seq[row]), y });
      if (seq[row + 1] !== seq[row]) pts.push({ x: xOf(seq[row + 1]), y });
    }
    pts.push({ x: xOf(seq[ladder.rows]), y: height - TOP });
    return pts;
  }

  const reduced = ctx.reducedMotion; // 전역 대신 주입값 사용(Global Constraint)
  let cancelled = false;

  function animateOne(i, done) {
    const pts = pathPoints(i);
    token.style.background = `radial-gradient(circle at 35% 30%, #fff, ${participants[i].color})`;
    let k = 0;
    token.style.left = (pts[0].x - 8) + 'px'; token.style.top = (pts[0].y - 8) + 'px';
    function next() {
      if (cancelled) return;
      k++;
      if (k >= pts.length) { done(); return; }
      token.style.left = (pts[k].x - 8) + 'px'; token.style.top = (pts[k].y - 8) + 'px';
      setTimeout(next, reduced ? 0 : 130);
    }
    setTimeout(next, reduced ? 0 : 130);
  }

  function finish() {
    ctx.mascot.setState('celebrate');
    const map = participants.map((p, i) => ({ name: p.name, color: p.color, result: results[assignments[i]] }));
    const body = document.createElement('div');
    map.forEach(m => {
      const row = document.createElement('div');
      row.style.margin = '6px 0';
      const b = document.createElement('b');
      b.style.color = m.color;
      b.textContent = m.name;
      row.appendChild(b);
      row.appendChild(document.createTextNode(` → ${m.result}`));
      body.appendChild(row);
    });
    ctx.showResult({
      title: '사다리 결과 🪜',
      bodyEl: body,
      actions: [
        { label: '다시하기', onClick: () => { ctx.hideResult(); ctx.navigate('#/game/ladder'); } },
        { label: '홈', kind: 'secondary', onClick: () => { ctx.hideResult(); ctx.navigate('#/'); } },
      ],
    });
  }

  // 참가자 순차 애니메이션 → 끝나면 결과
  function runFrom(i) {
    if (cancelled) return;
    if (i >= n) { finish(); return; }
    animateOne(i, () => runFrom(i + 1));
  }
  skip.addEventListener('click', () => { cancelled = true; finish(); });
  if (reduced) finish(); else runFrom(0);
  return () => { cancelled = true; };
}
