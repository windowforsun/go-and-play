import { generateLadder, computeAssignments } from './ladder.logic.js';
import { playLadder } from './play.js';

let activeStop = null;

export default {
  id: 'ladder',
  name: '사다리 타기',
  icon: '🪜',
  type: 'assign',
  minPlayers: 2,

  mount(container, ctx) {
    this._container = container;
    this._ctx = ctx;
    renderSetup(container, ctx);
  },

  unmount() {
    if (activeStop) { activeStop(); activeStop = null; }
    if (this._container) this._container.innerHTML = '';
  },
};

function renderSetup(container, ctx) {
  const participants = ctx.participants;
  // 결과 항목 기본값: 참가자 수만큼. 관례상 "꽝" 여러 개 + "당첨" 1개.
  const results = participants.map((_, i) => (i === 0 ? '당첨 🎉' : '꽝'));

  const wrap = document.createElement('div');
  wrap.className = 'ladder-setup card';
  wrap.innerHTML = '<h2>🪜 사다리 타기 — 결과 정하기</h2>';

  const list = document.createElement('div');
  list.className = 'ladder-results';
  results.forEach((r, i) => {
    const row = document.createElement('div');
    row.className = 'pe-row';
    const dot = document.createElement('span');
    dot.className = 'pe-dot'; dot.style.background = participants[i].color;
    const input = document.createElement('input');
    input.className = 'pe-input'; input.value = r;
    input.addEventListener('input', () => { results[i] = input.value; });
    row.append(dot, input);
    list.appendChild(row);
  });
  wrap.appendChild(list);

  const actions = document.createElement('div');
  actions.className = 'ladder-actions';
  const back = document.createElement('button');
  back.className = 'jelly-btn secondary'; back.textContent = '← 홈';
  back.addEventListener('click', () => ctx.navigate('#/'));
  const start = document.createElement('button');
  start.className = 'jelly-btn'; start.textContent = '출발! 🪜';
  start.addEventListener('click', () => {
    const ladder = generateLadder(participants.length, Math.max(8, participants.length * 3), ctx.random.rng);
    const assignments = computeAssignments(ladder);
    activeStop = playLadder(container, ctx, { participants, results: results.map(r => r.trim() || '꽝'), ladder, assignments });
  });
  actions.append(back, start);
  wrap.appendChild(actions);

  container.innerHTML = '';
  container.appendChild(wrap);
}
