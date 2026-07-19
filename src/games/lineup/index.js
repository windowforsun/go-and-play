let cancelled = false;

export default {
  id: 'lineup',
  name: '랜덤 줄 세우기',
  icon: '🚶',
  type: 'order',
  minPlayers: 2,
  mount(container, ctx) { this._c = container; cancelled = false; render(container, ctx); },
  unmount() { cancelled = true; if (this._c) this._c.innerHTML = ''; },
};

function render(container, ctx) {
  const ps = ctx.participants;
  const n = ps.length;

  const panel = document.createElement('div');
  panel.className = 'game-panel';
  panel.innerHTML = '<h2>🚶 랜덤 줄 세우기</h2><div class="hint">버튼을 누르면 순서가 무작위로 정해져요</div>';

  const list = document.createElement('div');
  list.className = 'lineup-list';

  const actions = document.createElement('div');
  actions.className = 'game-actions';
  actions.append(
    mkBtn('줄 세우기 🔀', 'jelly-btn', shuffleOrder),
    mkBtn('홈', 'jelly-btn secondary', () => ctx.navigate('#/')),
  );

  panel.append(list, actions);
  container.innerHTML = '';
  container.appendChild(panel);
  shuffleOrder();

  function shuffleOrder() {
    if (cancelled) return;
    ctx.mascot.setState('thinking');
    const order = ctx.random.shuffle(ps.map((_, i) => i)); // 위치 k → 참가자 order[k]
    list.innerHTML = '';
    order.forEach((pi, k) => {
      const row = document.createElement('div');
      row.className = 'lineup-row';
      row.style.animationDelay = (k * 0.1) + 's';
      const num = document.createElement('span');
      num.className = 'lineup-num'; num.textContent = (k + 1);
      const nm = document.createElement('span');
      nm.className = 'lineup-name'; nm.style.background = ps[pi].color; nm.textContent = ps[pi].name;
      row.append(num, nm);
      list.appendChild(row);
    });
    setTimeout(() => { if (!cancelled) ctx.mascot.setState('celebrate'); }, n * 100 + 200);
  }
}

function mkBtn(text, cls, on) {
  const b = document.createElement('button');
  b.className = cls; b.textContent = text; b.addEventListener('click', on);
  return b;
}
