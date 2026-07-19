import { MOVES, MOVE_EMOJI, rpsResult } from './rps.logic.js';

let cancelled = false;

export default {
  id: 'rps',
  name: '가위바위보',
  icon: '✊',
  type: 'contest',
  minPlayers: 2,
  mount(container, ctx) { this._c = container; cancelled = false; render(container, ctx); },
  unmount() { cancelled = true; if (this._c) this._c.innerHTML = ''; },
};

function render(container, ctx) {
  const ps = ctx.participants;
  let round, next, a, b, aMove, bMove;

  const panel = document.createElement('div');
  panel.className = 'game-panel';
  panel.innerHTML = '<h2>✊ 가위바위보 토너먼트</h2><div class="hint">두 명이 번갈아 몰래 선택 → 공개! 이긴 사람이 진출</div>';

  const statusEl = document.createElement('div'); statusEl.className = 'rps-status';
  const matchEl = document.createElement('div'); matchEl.className = 'rps-match';
  const choicesEl = document.createElement('div'); choicesEl.className = 'rps-choices';
  const revealEl = document.createElement('div'); revealEl.className = 'rps-reveal';
  const nextWrap = document.createElement('div'); nextWrap.className = 'game-actions';

  const actions = document.createElement('div');
  actions.className = 'game-actions';
  actions.append(
    mkBtn('리셋 🔄', 'jelly-btn secondary', reset),
    mkBtn('홈', 'jelly-btn secondary', () => ctx.navigate('#/')),
  );

  panel.append(statusEl, matchEl, choicesEl, revealEl, nextWrap, actions);
  container.innerHTML = '';
  container.appendChild(panel);
  reset();

  function reset() {
    if (cancelled) return;
    round = ctx.random.shuffle(ps.map((_, i) => i));
    next = [];
    ctx.mascot.setState('idle');
    nextStep();
  }

  // 다음 대결 준비 또는 우승자 결정
  function nextStep() {
    while (round.length < 2) {
      if (round.length + next.length <= 1) {
        return champion(round.length ? round[0] : next[0]);
      }
      if (round.length === 1) next.push(round.shift()); // 부전승
      round = next; next = [];
    }
    a = round.shift(); b = round.shift();
    aMove = null; bMove = null;
    ctx.mascot.setState('thinking');
    renderPick();
  }

  function alive() { return round.length + next.length + 2; }

  function renderPick() {
    const who = aMove === null ? a : b;
    statusEl.textContent = `남은 인원: ${alive()}명`;
    matchEl.innerHTML = '';
    const nm = document.createElement('b'); nm.style.color = ps[who].color; nm.textContent = ps[who].name;
    matchEl.append(nm, document.createTextNode(' 차례 — 몰래 선택 🤫'));
    revealEl.textContent = '';
    nextWrap.innerHTML = '';
    choicesEl.innerHTML = '';
    MOVES.forEach(m => {
      const btn = document.createElement('button');
      btn.className = 'rps-choice'; btn.textContent = MOVE_EMOJI[m];
      btn.addEventListener('click', () => pick(m));
      choicesEl.appendChild(btn);
    });
  }

  function pick(move) {
    if (cancelled) return;
    if (aMove === null) { aMove = move; renderPick(); return; } // 이제 B 차례
    bMove = move;
    choicesEl.innerHTML = '';
    reveal();
  }

  function reveal() {
    const r = rpsResult(aMove, bMove);
    matchEl.innerHTML = '';
    revealEl.innerHTML = '';
    const ea = document.createElement('span'); ea.textContent = MOVE_EMOJI[aMove];
    const vs = document.createElement('span'); vs.className = 'vs'; vs.textContent = 'vs';
    const eb = document.createElement('span'); eb.textContent = MOVE_EMOJI[bMove];
    revealEl.append(ea, vs, eb);
    nextWrap.innerHTML = '';

    if (r === 'draw') {
      matchEl.textContent = '비겼다! 다시 🤝';
      nextWrap.appendChild(mkBtn('다시', 'jelly-btn', () => { aMove = null; bMove = null; renderPick(); }));
      return;
    }
    const winner = r === 'a' ? a : b;
    const loser = r === 'a' ? b : a;
    const wn = document.createElement('b'); wn.style.color = ps[winner].color; wn.textContent = ps[winner].name;
    matchEl.append(wn, document.createTextNode(' 승리! 🎉'));
    nextWrap.appendChild(mkBtn('다음 대결 ▶', 'jelly-btn', () => { next.push(winner); nextStep(); }));
    // loser는 탈락(다음 라운드에 안 넣음)
    void loser;
  }

  function champion(idx) {
    statusEl.textContent = '';
    matchEl.innerHTML = '';
    choicesEl.innerHTML = '';
    revealEl.textContent = '🏆';
    nextWrap.innerHTML = '';
    ctx.mascot.setState('celebrate');
    ctx.showResult({
      title: '우승! 🏆',
      bodyHtml: `<div style="font-size:24px">🏆 <b style="color:${ps[idx].color}">${escapeHtml(ps[idx].name)}</b></div>`,
      actions: [
        { label: '다시', onClick: () => { ctx.hideResult(); reset(); } },
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
