import { spinToIndex, indexAtPointer } from './roulette.logic.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const CX = 150, CY = 150, R = 140;
const ITEM_COLORS = ['#ff3d84', '#38b6aa', '#ffd45c', '#a06bff', '#6db8ff', '#ff9a76', '#4fe0d0', '#ff6fae'];

let timer = null, cancelled = false;

export default {
  id: 'roulette',
  name: '룰렛',
  icon: '🎡',
  type: 'pick-one',
  minPlayers: 2,
  mount(container, ctx) { this._c = container; cancelled = false; render(container, ctx); },
  unmount() { cancelled = true; if (timer) { clearTimeout(timer); timer = null; } if (this._c) this._c.innerHTML = ''; },
};

function polar(deg, r) {
  const rad = deg * Math.PI / 180;
  return { x: CX + r * Math.sin(rad), y: CY - r * Math.cos(rad) };
}

function render(container, ctx) {
  const ps = ctx.participants;
  let mode = 'people';                 // 'people' | 'items'
  let items = ['커피 ☕', '치킨 🍗', '꽝', '당첨 🎉'];
  let pickCount = 1;
  let pool = [];                       // [{name, color}]
  let currentDeg = 0, spinning = false;
  let wheel, sectors = [];

  const panel = document.createElement('div');
  panel.className = 'game-panel';
  panel.innerHTML = '<h2>🎡 룰렛</h2>';

  // 설정 바
  const bar = document.createElement('div');
  bar.className = 'draw-modebar';
  const peopleBtn = mkBtn('사람 뽑기', 'mode-btn', () => setMode('people'));
  const itemsBtn = mkBtn('항목 룰렛', 'mode-btn', () => setMode('items'));
  const countCtl = document.createElement('span');
  countCtl.className = 'roulette-count';
  const minus = mkBtn('−', 'mode-step', () => setCount(pickCount - 1));
  const countNum = document.createElement('span'); countNum.className = 'draw-teamnum';
  const plus = mkBtn('+', 'mode-step', () => setCount(pickCount + 1));
  countCtl.append(document.createTextNode('뽑을 수 '), minus, countNum, plus);
  bar.append(peopleBtn, itemsBtn, countCtl);

  const itemsBox = document.createElement('textarea');
  itemsBox.className = 'roulette-items';
  itemsBox.placeholder = '한 줄에 항목 하나 (예: 커피 / 치킨 / 꽝)';
  itemsBox.value = items.join('\n');
  itemsBox.addEventListener('input', () => {
    items = itemsBox.value.split('\n').map(s => s.trim()).filter(Boolean);
    rebuild();
  });

  const stage = document.createElement('div');
  stage.className = 'roulette-stage';
  stage.innerHTML = '<div class="roulette-pointer">🔻</div>';
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('width', 300); svg.setAttribute('height', 300);
  svg.setAttribute('viewBox', '0 0 300 300');
  wheel = document.createElementNS(SVGNS, 'g');
  wheel.setAttribute('class', 'roulette-wheel');
  svg.appendChild(wheel);
  stage.appendChild(svg);
  stage.insertAdjacentHTML('beforeend', '<div class="roulette-center">🎯</div>');

  const actions = document.createElement('div');
  actions.className = 'game-actions';
  const spinBtn = mkBtn('돌리기 🎡', 'jelly-btn', spin);
  actions.append(spinBtn, mkBtn('홈', 'jelly-btn secondary', () => ctx.navigate('#/')));

  panel.append(bar, itemsBox, stage, actions);
  container.innerHTML = '';
  container.appendChild(panel);
  setMode('people');

  function setMode(m) {
    mode = m;
    peopleBtn.classList.toggle('on', m === 'people');
    itemsBtn.classList.toggle('on', m === 'items');
    itemsBox.style.display = m === 'items' ? 'block' : 'none';
    rebuild();
  }

  function setCount(c) {
    pickCount = Math.max(1, Math.min(pool.length, c));
    countNum.textContent = pickCount;
  }

  function computePool() {
    pool = mode === 'people'
      ? ps.map(p => ({ name: p.name, color: p.color }))
      : items.map((t, i) => ({ name: t, color: ITEM_COLORS[i % ITEM_COLORS.length] }));
  }

  function rebuild() {
    computePool();
    if (pickCount > pool.length) pickCount = pool.length;
    if (pickCount < 1) pickCount = 1;
    countNum.textContent = pickCount;
    currentDeg = 0;
    wheel.style.transition = 'none';
    wheel.style.transform = 'rotate(0deg)';
    buildWheel();
    ctx.mascot.setState('idle');
  }

  function buildWheel() {
    wheel.innerHTML = '';
    sectors = [];
    const n = pool.length;
    if (n < 1) return;
    const slice = 360 / n;
    pool.forEach((it, i) => {
      const a1 = i * slice, a2 = (i + 1) * slice;
      const p1 = polar(a1, R), p2 = polar(a2, R);
      const large = (a2 - a1) > 180 ? 1 : 0;
      const path = document.createElementNS(SVGNS, 'path');
      path.setAttribute('d', `M ${CX} ${CY} L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${R} ${R} 0 ${large} 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} Z`);
      path.setAttribute('fill', it.color);
      path.style.stroke = 'var(--bg2)';
      path.setAttribute('stroke-width', '2');
      wheel.appendChild(path);
      sectors.push(path);
      const lp = polar(a1 + slice / 2, R * 0.66);
      const t = document.createElementNS(SVGNS, 'text');
      t.setAttribute('x', lp.x.toFixed(1)); t.setAttribute('y', lp.y.toFixed(1));
      t.setAttribute('fill', '#fff'); t.setAttribute('font-size', n > 8 ? '9' : '11');
      t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'middle');
      t.setAttribute('transform', `rotate(${a1 + slice / 2} ${lp.x.toFixed(1)} ${lp.y.toFixed(1)})`);
      t.textContent = it.name;
      wheel.appendChild(t);
    });
  }

  function spin() {
    if (spinning || cancelled) return;
    const n = pool.length;
    if (n < 2) return;
    spinning = true;
    ctx.mascot.setState('thinking');
    sectors.forEach(s => { s.setAttribute('stroke-width', '2'); s.setAttribute('stroke', 'var(--bg2)'); s.style.stroke = 'var(--bg2)'; });
    const k = Math.max(1, Math.min(pickCount, n));
    const winners = ctx.random.shuffle(pool.map((_, i) => i)).slice(0, k);
    const first = winners[0];
    const extra = 5 + Math.floor(ctx.random.rng() * 4);
    const desired = spinToIndex(first, n, 0) % 360;
    const curMod = ((currentDeg % 360) + 360) % 360;
    currentDeg += ((desired - curMod + 360) % 360) + extra * 360;
    wheel.style.transition = 'transform 3.8s cubic-bezier(.16,.84,.24,1)';
    timer = setTimeout(() => {
      if (cancelled) return;
      wheel.style.transform = `rotate(${currentDeg}deg)`;
      timer = setTimeout(() => finish(winners), 3900);
    }, 30);
  }

  function finish(winners) {
    if (cancelled) return;
    spinning = false;
    const landed = indexAtPointer(currentDeg, pool.length);
    // 시각적으로 포인터가 가리키는 칸을 첫 당첨으로 맞춘다(항상 winners[0]와 동일)
    const all = [landed, ...winners.filter(w => w !== landed)].slice(0, winners.length);
    all.forEach(w => { sectors[w].setAttribute('stroke-width', '6'); sectors[w].setAttribute('stroke', '#fff'); sectors[w].style.stroke = '#fff'; });
    ctx.mascot.setState('celebrate');
    const body = document.createElement('div');
    if (all.length === 1) {
      body.innerHTML = `<div style="font-size:22px">🎉 <b style="color:${pool[all[0]].color}"></b></div>`;
      body.querySelector('b').textContent = pool[all[0]].name;
      body.querySelector('div').appendChild(document.createTextNode(' 당첨!'));
    } else {
      const h = document.createElement('div'); h.style.marginBottom = '6px'; h.textContent = `당첨 ${all.length}개 🎉`;
      body.appendChild(h);
      all.forEach(w => {
        const row = document.createElement('div'); row.style.margin = '3px 0';
        const b = document.createElement('b'); b.style.color = pool[w].color; b.textContent = pool[w].name;
        row.appendChild(b); body.appendChild(row);
      });
    }
    ctx.showResult({
      title: '룰렛 결과 🎡',
      bodyEl: body,
      actions: [
        { label: '다시 돌리기', onClick: () => { ctx.hideResult(); ctx.mascot.setState('idle'); spin(); } },
        { label: '홈', kind: 'secondary', onClick: () => { ctx.hideResult(); ctx.navigate('#/'); } },
      ],
    });
  }
}

function mkBtn(text, cls, on) {
  const b = document.createElement('button');
  b.className = cls; b.textContent = text; b.addEventListener('click', on);
  return b;
}
