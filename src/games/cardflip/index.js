let cancelled = false;

export default {
  id: 'cardflip',
  name: '카드 뒤집기',
  icon: '🃏',
  type: 'pick-one',
  minPlayers: 2,
  mount(container, ctx) { this._c = container; cancelled = false; render(container, ctx); },
  unmount() { cancelled = true; if (this._c) this._c.innerHTML = ''; },
};

function render(container, ctx) {
  const ps = ctx.participants;
  const n = ps.length;
  const CARDS = Math.max(n, 4);
  let bomb, turn, over, cards;

  const panel = document.createElement('div');
  panel.className = 'game-panel';
  panel.innerHTML = '<h2>🃏 카드 뒤집기</h2><div class="hint">순서대로 카드 한 장씩 선택! 💣를 뒤집으면 술래</div>';

  const turnEl = document.createElement('div'); turnEl.className = 'contest-turn';
  const grid = document.createElement('div'); grid.className = 'draw-grid';

  const actions = document.createElement('div');
  actions.className = 'game-actions';
  actions.append(
    mkBtn('리셋 🔄', 'jelly-btn secondary', reset),
    mkBtn('홈', 'jelly-btn secondary', () => ctx.navigate('#/')),
  );

  panel.append(turnEl, grid, actions);
  container.innerHTML = '';
  container.appendChild(panel);
  reset();

  function currentPlayer() { return ps[turn % n]; }

  function refreshTurn() {
    const p = currentPlayer();
    turnEl.innerHTML = '';
    turnEl.append(document.createTextNode('차례: '));
    const b = document.createElement('b'); b.style.background = p.color; b.textContent = p.name;
    turnEl.appendChild(b);
  }

  function reset() {
    if (cancelled) return;
    bomb = Math.floor(ctx.random.rng() * CARDS);
    turn = 0; over = false;
    ctx.mascot.setState('idle');
    grid.innerHTML = '';
    cards = [];
    for (let i = 0; i < CARDS; i++) {
      const card = document.createElement('div');
      card.className = 'draw-card';
      const inner = document.createElement('div'); inner.className = 'draw-inner';
      const back = document.createElement('div'); back.className = 'draw-face draw-back';
      back.innerHTML = '<div style="font-size:26px">🃏</div>';
      const front = document.createElement('div'); front.className = 'draw-face draw-front';
      front.style.fontSize = '30px';
      front.textContent = i === bomb ? '💣' : '✅';
      front.style.background = i === bomb ? '#8e2a20' : '#1ea75a';
      inner.append(back, front);
      card.appendChild(inner);
      card.addEventListener('click', () => flip(i));
      grid.appendChild(card);
      cards.push(card);
    }
    refreshTurn();
  }

  function flip(i) {
    if (cancelled || over || cards[i].classList.contains('flipped')) return;
    cards[i].classList.add('flipped');
    if (i === bomb) {
      over = true;
      const p = currentPlayer();
      ctx.mascot.setState('celebrate');
      ctx.showResult({
        title: '펑! 💣',
        bodyHtml: `<div style="font-size:22px">술래는 <b style="color:${p.color}">${escapeHtml(p.name)}</b>!</div>`,
        actions: [
          { label: '다시', onClick: () => { ctx.hideResult(); reset(); } },
          { label: '홈', kind: 'secondary', onClick: () => { ctx.hideResult(); ctx.navigate('#/'); } },
        ],
      });
      return;
    }
    turn++;
    ctx.mascot.setState('thinking');
    refreshTurn();
  }
}

function mkBtn(text, cls, on) {
  const b = document.createElement('button');
  b.className = cls; b.textContent = text; b.addEventListener('click', on);
  return b;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
