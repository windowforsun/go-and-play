import { pickSecret, judge, narrow, isValidGuess } from './updown.logic.js';

const LOW = 1, HIGH = 100;
let cancelled = false;

export default {
  id: 'updown',
  name: '숫자 업다운',
  icon: '🔢',
  type: 'contest',
  minPlayers: 2,
  mount(container, ctx) { this._c = container; cancelled = false; render(container, ctx); },
  unmount() { cancelled = true; if (this._c) this._c.innerHTML = ''; },
};

function render(container, ctx) {
  const ps = ctx.participants;
  const n = ps.length;
  let secret, range, turn, over;

  const panel = document.createElement('div');
  panel.className = 'game-panel';
  panel.innerHTML = '<h2>🔢 숫자 업다운</h2><div class="hint">돌아가며 숫자를 외쳐요. 폰의 비밀 숫자를 맞히면 술래!</div>';

  const turnEl = document.createElement('div');
  turnEl.className = 'contest-turn';
  const rangeEl = document.createElement('div');
  rangeEl.className = 'updown-range';

  const inputWrap = document.createElement('div');
  inputWrap.className = 'updown-input';
  const input = document.createElement('input');
  input.type = 'number';
  input.setAttribute('inputmode', 'numeric');
  const submit = mkBtn('제출', 'jelly-btn', doGuess);
  submit.style.flex = '0 0 auto';
  inputWrap.append(input, submit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') doGuess(); });

  const feedback = document.createElement('div');
  feedback.className = 'updown-feedback';

  const actions = document.createElement('div');
  actions.className = 'game-actions';
  actions.append(
    mkBtn('리셋 🔄', 'jelly-btn secondary', reset),
    mkBtn('홈', 'jelly-btn secondary', () => ctx.navigate('#/')),
  );

  panel.append(turnEl, rangeEl, inputWrap, feedback, actions);
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
    rangeEl.innerHTML = `<span class="lo">${range.low}</span> ~ <span class="hi">${range.high}</span>`;
    input.min = String(range.low); input.max = String(range.high); input.value = '';
    input.disabled = over; submit.disabled = over;
    if (!over) input.focus();
  }

  function doGuess() {
    if (cancelled || over) return;
    const g = parseInt(input.value, 10);
    if (!isValidGuess(range, g)) { feedback.textContent = `${range.low}~${range.high} 사이 숫자를 입력하세요`; return; }
    const r = judge(secret, g);
    if (r === 'hit') {
      over = true;
      ctx.mascot.setState('celebrate');
      const p = currentPlayer();
      feedback.textContent = `💥 ${g}! 술래는 ${p.name}`;
      refresh();
      ctx.showResult({
        title: '펑! 💥',
        bodyHtml: `<div style="font-size:22px">비밀 숫자 <b>${secret}</b> — 술래는 <b style="color:${p.color}">${escapeHtml(p.name)}</b>!</div>`,
        actions: [
          { label: '다시', onClick: () => { ctx.hideResult(); reset(); } },
          { label: '홈', kind: 'secondary', onClick: () => { ctx.hideResult(); ctx.navigate('#/'); } },
        ],
      });
      return;
    }
    range = narrow(range, g, r);
    feedback.textContent = r === 'up' ? `${g} 보다 커요 ⬆️` : `${g} 보다 작아요 ⬇️`;
    turn++;
    ctx.mascot.setState('thinking');
    refresh();
  }

  function reset() {
    if (cancelled) return;
    secret = pickSecret(LOW, HIGH, ctx.random.rng);
    range = { low: LOW, high: HIGH };
    turn = 0; over = false;
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
