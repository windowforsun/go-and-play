let cancelled = false;

export default {
  id: 'draw',
  name: '제비뽑기',
  icon: '🎴',
  type: 'assign',
  minPlayers: 2,
  mount(container, ctx) { this._c = container; cancelled = false; render(container, ctx); },
  unmount() { cancelled = true; if (this._c) this._c.innerHTML = ''; },
};

function defaultResults(n) {
  return ['당첨 🎉', ...Array(Math.max(0, n - 1)).fill('꽝')];
}

function render(container, ctx) {
  const ps = ctx.participants;
  const n = ps.length;
  let assign = ctx.random.shuffle(defaultResults(n)); // 참가자 i → assign[i]
  const cards = [];
  const revealed = new Set();

  const panel = document.createElement('div');
  panel.className = 'game-panel';
  panel.innerHTML = '<h2>🎴 제비뽑기</h2><div class="hint">카드를 눌러 뒤집어 보세요 (당첨 1개)</div>';

  const grid = document.createElement('div');
  grid.className = 'draw-grid';

  ps.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'draw-card';
    const inner = document.createElement('div');
    inner.className = 'draw-inner';

    const back = document.createElement('div');
    back.className = 'draw-face draw-back';
    back.innerHTML = '<div style="font-size:26px">🎴</div>';
    const backName = document.createElement('div');
    backName.className = 'draw-name'; backName.style.color = '#fff'; backName.textContent = p.name;
    back.appendChild(backName);

    const front = document.createElement('div');
    front.className = 'draw-face draw-front';
    front.style.background = p.color;
    const res = document.createElement('div');
    res.style.fontSize = '15px'; res.textContent = assign[i];
    const frontName = document.createElement('div');
    frontName.className = 'draw-name'; frontName.style.color = 'rgba(255,255,255,.85)'; frontName.textContent = p.name;
    front.append(res, frontName);

    inner.append(back, front);
    card.appendChild(inner);
    card.addEventListener('click', () => reveal(i));
    grid.appendChild(card);
    cards.push({ card, res });
  });

  const actions = document.createElement('div');
  actions.className = 'game-actions';
  actions.append(
    mkBtn('전체 공개', 'jelly-btn', revealAll),
    mkBtn('리셋 🔄', 'jelly-btn secondary', reset),
    mkBtn('홈', 'jelly-btn secondary', () => ctx.navigate('#/')),
  );

  panel.append(grid, actions);
  container.innerHTML = '';
  container.appendChild(panel);
  ctx.mascot.setState('idle');

  function reveal(i) {
    if (cancelled || revealed.has(i)) return;
    cards[i].card.classList.add('flipped');
    revealed.add(i);
    if (assign[i].startsWith('당첨')) ctx.mascot.setState('celebrate');
    if (revealed.size === n) ctx.mascot.setState('celebrate');
  }

  function revealAll() {
    for (let i = 0; i < n; i++) reveal(i);
  }

  function reset() {
    if (cancelled) return;
    assign = ctx.random.shuffle(defaultResults(n));
    revealed.clear();
    cards.forEach((c, i) => { c.card.classList.remove('flipped'); c.res.textContent = assign[i]; });
    ctx.mascot.setState('idle');
  }
}

function mkBtn(text, cls, on) {
  const b = document.createElement('button');
  b.className = cls; b.textContent = text; b.addEventListener('click', on);
  return b;
}
