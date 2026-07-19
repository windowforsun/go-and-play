import { loadBullet, willFire, oddsText } from './russian.logic.js';

let cancelled = false;

export default {
  id: 'russian',
  name: '러시안 룰렛',
  icon: '🔫',
  type: 'pick-one',
  minPlayers: 2,
  mount(container, ctx) { this._c = container; cancelled = false; render(container, ctx); },
  unmount() { cancelled = true; if (this._c) this._c.innerHTML = ''; },
};

function render(container, ctx) {
  const ps = ctx.participants;
  const n = ps.length;
  const chambers = n; // n약실 · 탄환 1발 → 한 바퀴 안에 결판
  let bullet, position, turn, over;

  const panel = document.createElement('div');
  panel.className = 'game-panel';
  panel.innerHTML = '<h2>🔫 러시안 룰렛</h2><div class="hint">순서대로 방아쇠를 당겨요. 탄환이 나오면 술래!</div>';

  const turnEl = document.createElement('div'); turnEl.className = 'contest-turn';
  const cyl = document.createElement('div'); cyl.className = 'russian-cyl';
  const oddsEl = document.createElement('div'); oddsEl.className = 'russian-odds';
  const feedback = document.createElement('div'); feedback.className = 'updown-feedback';

  const actions = document.createElement('div');
  actions.className = 'game-actions';
  const pullBtn = mkBtn('방아쇠 당기기 🔫', 'jelly-btn', pull);
  actions.append(
    pullBtn,
    mkBtn('리셋 🔄', 'jelly-btn secondary', reset),
    mkBtn('홈', 'jelly-btn secondary', () => ctx.navigate('#/')),
  );

  panel.append(turnEl, cyl, oddsEl, feedback, actions);
  container.innerHTML = '';
  container.appendChild(panel);
  reset();

  function currentPlayer() { return ps[turn % n]; }

  function refresh() {
    const p = currentPlayer();
    turnEl.innerHTML = '';
    turnEl.append(document.createTextNode('차례: '));
    const b = document.createElement('b'); b.style.background = p.color; b.textContent = p.name;
    turnEl.appendChild(b);
    cyl.innerHTML = '';
    for (let i = 0; i < chambers; i++) {
      const dot = document.createElement('span');
      dot.className = 'russian-chamber' + (i < position ? ' spent' : '') + (i === position && !over ? ' active' : '');
      cyl.appendChild(dot);
    }
    oddsEl.textContent = over ? '' : `이번 확률 ${oddsText(chambers - position)}`;
    pullBtn.disabled = over;
  }

  function pull() {
    if (cancelled || over) return;
    if (willFire(bullet, position)) {
      over = true;
      const p = currentPlayer();
      feedback.textContent = `탕! 💥 술래는 ${p.name}`;
      refresh();
      ctx.mascot.setState('celebrate');
      ctx.showResult({
        title: '탕! 💥',
        bodyHtml: `<div style="font-size:22px">술래는 <b style="color:${p.color}">${escapeHtml(p.name)}</b>!</div>`,
        actions: [
          { label: '다시', onClick: () => { ctx.hideResult(); reset(); } },
          { label: '홈', kind: 'secondary', onClick: () => { ctx.hideResult(); ctx.navigate('#/'); } },
        ],
      });
      return;
    }
    feedback.textContent = '찰칵… 살았다 😮‍💨';
    position++;
    turn++;
    ctx.mascot.setState('thinking');
    refresh();
  }

  function reset() {
    if (cancelled) return;
    bullet = loadBullet(chambers, ctx.random.rng);
    position = 0; turn = 0; over = false;
    feedback.textContent = '';
    ctx.mascot.setState('idle');
    refresh();
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
