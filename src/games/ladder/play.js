import { rungKey, tracePath, generateLadder, computeAssignments } from './ladder.logic.js';

const TOP = 20, ROW_GAP = 22, PAD = 26, MAX_W = 480, MIN_GAP = 34, TOKEN = 16;
const SPEED = 0.5; // 토큰 이동 속도(px/ms) — 세그먼트 거리에 비례한 등속 이동

export function playLadder(container, ctx, data) {
  const { participants, results } = data;
  const n = participants.length;
  const rows = data.ladder.rows;

  // 반응형 열 간격: 참가자가 많아도 컨테이너를 넘지 않고 정렬이 유지되도록
  const gap = Math.max(MIN_GAP, Math.min(70, (MAX_W - PAD * 2) / Math.max(1, n - 1)));
  const width = PAD * 2 + (n - 1) * gap;
  const svgH = TOP * 2 + rows * ROW_GAP;
  const svgNS = 'http://www.w3.org/2000/svg';
  const xOf = (col) => PAD + col * gap;
  const yOf = (row) => TOP + (row + 0.5) * ROW_GAP;

  let state = { ladder: data.ladder, assignments: data.assignments };
  let running = false;   // 레인 애니메이션 진행 중
  let cancelled = false; // unmount 취소
  let timer = null;
  const revealed = new Set();

  // ── 골격 ──
  const stage = document.createElement('div');
  stage.className = 'ladder-stage';
  const board = document.createElement('div');
  board.className = 'ladder-board';
  board.style.width = width + 'px';

  const topRow = document.createElement('div');
  topRow.className = 'ladder-row';
  const bottomRow = document.createElement('div');
  bottomRow.className = 'ladder-row';

  const wrap = document.createElement('div');
  wrap.className = 'ladder-svg-wrap';
  wrap.style.width = width + 'px';
  wrap.style.height = svgH + 'px';
  let svg, token, highlightLayer;

  // 상단 참가자 라벨 (열에 정렬 · 클릭 시 그 레인 추적)
  const topLabels = [], bottomLabels = [];
  participants.forEach((p, i) => {
    const s = document.createElement('button');
    s.type = 'button';
    s.className = 'ladder-label';
    s.textContent = p.name;
    s.style.background = p.color;
    s.style.left = xOf(i) + 'px';
    s.addEventListener('click', () => traceLane(i));
    topRow.appendChild(s);
    topLabels.push(s);
  });
  // 하단 결과 라벨 (열에 정렬 · 클릭 시 그 결과에 도착하는 참가자 추적)
  results.forEach((r, j) => {
    const s = document.createElement('button');
    s.type = 'button';
    s.className = 'ladder-label result';
    s.textContent = r;
    s.style.left = xOf(j) + 'px';
    s.addEventListener('click', () => traceToResult(j));
    bottomRow.appendChild(s);
    bottomLabels.push(s);
  });

  // 버튼 바
  const actions = document.createElement('div');
  actions.className = 'ladder-actions';
  actions.append(
    mkBtn('전체 결과', 'jelly-btn', revealAll),
    mkBtn('리셋 🔄', 'jelly-btn secondary', reset),
    mkBtn('홈', 'jelly-btn secondary', () => ctx.navigate('#/')),
  );

  board.append(topRow, wrap, bottomRow);
  stage.append(board, actions);
  container.innerHTML = '';
  container.appendChild(stage);

  buildSvg();
  ctx.mascot.setState('idle');

  function mkBtn(text, cls, on) {
    const b = document.createElement('button');
    b.className = cls;
    b.textContent = text;
    b.addEventListener('click', on);
    return b;
  }

  function buildSvg() {
    wrap.innerHTML = '';
    svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', svgH);
    // 세로줄
    for (let c = 0; c < n; c++) {
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', xOf(c)); line.setAttribute('x2', xOf(c));
      line.setAttribute('y1', TOP); line.setAttribute('y2', svgH - TOP);
      line.style.stroke = 'var(--rung-track)'; // CSS 속성으로 설정해야 var()가 해석됨
      line.setAttribute('stroke-width', '6');
      line.setAttribute('stroke-linecap', 'round');
      svg.appendChild(line);
    }
    // 가로줄
    for (let row = 0; row < rows; row++) {
      for (let left = 0; left < n - 1; left++) {
        if (!state.ladder.rungs.has(rungKey(row, left))) continue;
        const y = yOf(row);
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', xOf(left)); line.setAttribute('x2', xOf(left + 1));
        line.setAttribute('y1', y); line.setAttribute('y2', y);
        line.setAttribute('stroke', participants[left].color);
        line.setAttribute('stroke-width', '6');
        line.setAttribute('stroke-linecap', 'round');
        svg.appendChild(line);
      }
    }
    highlightLayer = document.createElementNS(svgNS, 'g');
    svg.appendChild(highlightLayer);
    wrap.appendChild(svg);

    token = document.createElement('div');
    token.className = 'ladder-token';
    token.style.display = 'none';
    wrap.appendChild(token);
  }

  // 경로 좌표(꼭짓점) — tracePath 단일 출처 사용 → 도착 열이 항상 결과와 일치
  function pathPoints(startCol) {
    const seq = tracePath(state.ladder, startCol);
    const pts = [{ x: xOf(seq[0]), y: TOP }];
    for (let row = 0; row < rows; row++) {
      const y = yOf(row);
      pts.push({ x: xOf(seq[row]), y });
      if (seq[row + 1] !== seq[row]) pts.push({ x: xOf(seq[row + 1]), y });
    }
    pts.push({ x: xOf(seq[rows]), y: svgH - TOP });
    return pts;
  }

  function placeToken(pt, color) {
    token.style.background = `radial-gradient(circle at 35% 30%, #fff, ${color})`;
    token.style.boxShadow = `0 0 12px ${color}`;
    token.style.left = (pt.x - TOKEN / 2) + 'px';
    token.style.top = (pt.y - TOKEN / 2) + 'px';
  }

  function drawPath(i, color) {
    const pts = pathPoints(i);
    const poly = document.createElementNS(svgNS, 'polyline');
    poly.setAttribute('points', pts.map(p => `${p.x},${p.y}`).join(' '));
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', color);
    poly.setAttribute('stroke-width', '4');
    poly.setAttribute('stroke-linecap', 'round');
    poly.setAttribute('stroke-linejoin', 'round');
    poly.setAttribute('opacity', '0.95');
    highlightLayer.appendChild(poly);
  }

  function litEndpoints(i, on) {
    topLabels[i].classList.toggle('lit', on);
    bottomLabels[state.assignments[i]].classList.toggle('lit', on);
  }

  // 개별 레인 추적 (부드러운 세그먼트 이동, 가로 이동 포함)
  // fromBottom=true 면 결과(아래)에서 참가자(위)로 역방향으로 올라간다.
  function traceLane(i, fromBottom = false) {
    if (running || cancelled) return;
    if (revealed.has(i)) { litEndpoints(i, true); return; }
    running = true;
    ctx.mascot.setState('thinking');
    const color = participants[i].color;
    const pts = pathPoints(i);
    const seq = fromBottom ? pts.slice().reverse() : pts; // 역방향이면 경로를 뒤집어 아래→위로

    if (ctx.reducedMotion || seq.length <= 1) {
      finishLane(i, color);
      return;
    }

    token.style.display = 'block';
    token.style.transition = 'none';
    placeToken(seq[0], color);

    let idx = 0;
    const step = () => {
      if (cancelled) return;
      idx++;
      if (idx >= seq.length) {
        token.style.display = 'none';
        finishLane(i, color);
        return;
      }
      const from = seq[idx - 1], to = seq[idx];
      const dist = Math.hypot(to.x - from.x, to.y - from.y);
      const dur = Math.max(55, dist / SPEED);
      token.style.transition = `top ${dur}ms linear, left ${dur}ms linear`;
      placeToken(to, color);
      timer = setTimeout(step, dur);
    };
    // 초기 위치를 먼저 그린 뒤(paint) 이동 시작 → 첫 세그먼트도 부드럽게
    timer = setTimeout(step, 30);
  }

  function finishLane(i, color) {
    drawPath(i, color);
    litEndpoints(i, true);
    revealed.add(i);
    running = false;
    ctx.mascot.setState('idle');
  }

  function traceToResult(j) {
    const i = state.assignments.indexOf(j); // 결과 열 j에 도착하는 참가자
    if (i >= 0) traceLane(i, true); // 아래에서 위로 역방향 추적
  }

  function revealAll() {
    if (running || cancelled) return;
    highlightLayer.innerHTML = '';
    revealed.clear();
    for (let i = 0; i < n; i++) {
      drawPath(i, participants[i].color);
      litEndpoints(i, true);
      revealed.add(i);
    }
    ctx.mascot.setState('celebrate');
    const body = document.createElement('div');
    participants.forEach((p, i) => {
      const row = document.createElement('div');
      row.style.margin = '6px 0';
      const b = document.createElement('b');
      b.style.color = p.color;
      b.textContent = p.name;
      row.appendChild(b);
      row.appendChild(document.createTextNode(` → ${results[state.assignments[i]]}`));
      body.appendChild(row);
    });
    ctx.showResult({
      title: '사다리 결과 🪜',
      bodyEl: body,
      actions: [
        { label: '리셋 🔄', onClick: () => { ctx.hideResult(); reset(); } },
        { label: '홈', kind: 'secondary', onClick: () => { ctx.hideResult(); ctx.navigate('#/'); } },
      ],
    });
  }

  // 홈에 갔다 오지 않고 그 자리에서 새 사다리로 리셋
  function reset() {
    if (cancelled) return;
    if (timer) { clearTimeout(timer); timer = null; }
    running = false;
    if (ctx.hideResult) ctx.hideResult();
    const ladder = generateLadder(n, rows, ctx.random.rng);
    state = { ladder, assignments: computeAssignments(ladder) };
    revealed.clear();
    topLabels.forEach(l => l.classList.remove('lit'));
    bottomLabels.forEach(l => l.classList.remove('lit'));
    buildSvg();
    ctx.mascot.setState('idle');
  }

  return () => { cancelled = true; if (timer) clearTimeout(timer); };
}
