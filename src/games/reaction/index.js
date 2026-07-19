let timer = null, cancelled = false;

export default {
  id: 'reaction',
  name: '반응속도',
  icon: '⚡',
  type: 'contest',
  minPlayers: 2,
  mount(container, ctx) { this._c = container; cancelled = false; render(container, ctx); },
  unmount() { cancelled = true; if (timer) { clearTimeout(timer); timer = null; } if (this._c) this._c.innerHTML = ''; },
};

const EARLY = Infinity;

function render(container, ctx) {
  const ps = ctx.participants;
  const n = ps.length;
  const times = new Array(n).fill(null);
  let idx = 0;
  let phase = 'ready'; // ready | waiting | go
  let startAt = 0;

  const panel = document.createElement('div');
  panel.className = 'game-panel';
  panel.innerHTML = '<h2>⚡ 반응속도</h2><div class="hint">초록이 되면 최대한 빨리 탭! (빨강에 누르면 부정출발)</div>';

  const turnEl = document.createElement('div');
  turnEl.className = 'contest-turn';

  const pad = document.createElement('div');
  pad.className = 'reaction-pad ready';
  pad.addEventListener('click', onTap);

  const list = document.createElement('div');
  list.className = 'reaction-list';

  const actions = document.createElement('div');
  actions.className = 'game-actions';
  actions.append(mkBtn('홈', 'jelly-btn secondary', () => ctx.navigate('#/')));

  panel.append(turnEl, pad, list, actions);
  container.innerHTML = '';
  container.appendChild(panel);
  ctx.mascot.setState('idle');
  beginTurn();

  function beginTurn() {
    phase = 'ready';
    pad.className = 'reaction-pad ready';
    const p = ps[idx];
    turnEl.innerHTML = '';
    turnEl.append(document.createTextNode('차례: '));
    const b = document.createElement('b'); b.style.background = p.color; b.textContent = p.name;
    turnEl.appendChild(b);
    pad.textContent = `${p.name} — 탭해서 시작`;
  }

  function arm() {
    phase = 'waiting';
    pad.className = 'reaction-pad waiting';
    pad.textContent = '대기…';
    const delay = 1200 + Math.floor(ctx.random.rng() * 2800);
    timer = setTimeout(() => {
      if (cancelled) return;
      phase = 'go';
      pad.className = 'reaction-pad go';
      pad.textContent = '지금! 탭!';
      startAt = performance.now();
    }, delay);
  }

  function onTap() {
    if (cancelled) return;
    if (phase === 'ready') { arm(); return; }
    if (phase === 'waiting') { // 부정출발
      if (timer) { clearTimeout(timer); timer = null; }
      record(idx, EARLY);
      pad.textContent = '부정출발! ❌';
      nextSoon();
      return;
    }
    if (phase === 'go') {
      const ms = Math.round(performance.now() - startAt);
      record(idx, ms);
      pad.className = 'reaction-pad ready';
      pad.textContent = `${ms} ms!`;
      nextSoon();
    }
  }

  function nextSoon() {
    phase = 'done';
    ctx.mascot.setState('thinking');
    timer = setTimeout(() => {
      if (cancelled) return;
      idx++;
      if (idx >= n) finish(); else beginTurn();
    }, 700);
  }

  function record(i, val) {
    times[i] = val;
    renderList();
  }

  function renderList() {
    list.innerHTML = '';
    ps.forEach((p, i) => {
      if (times[i] === null) return;
      const row = document.createElement('div');
      row.className = 'row';
      const nm = document.createElement('span'); nm.className = 'nm'; nm.style.background = p.color; nm.textContent = p.name;
      const t = document.createElement('span'); t.textContent = times[i] === EARLY ? '부정출발' : `${times[i]} ms`;
      row.append(nm, t);
      list.appendChild(row);
    });
  }

  function finish() {
    const ranked = ps
      .map((p, i) => ({ i, t: times[i] == null ? EARLY : times[i] }))
      .sort((a, b) => a.t - b.t);
    const loser = ranked[ranked.length - 1].i; // 제일 느린(또는 부정출발) 사람 = 술래
    ctx.mascot.setState('celebrate');
    const body = document.createElement('div');
    ranked.forEach((r, k) => {
      const row = document.createElement('div'); row.style.margin = '5px 0';
      const b = document.createElement('b'); b.style.color = ps[r.i].color; b.textContent = ps[r.i].name;
      row.appendChild(document.createTextNode(`${k + 1}등 — `));
      row.appendChild(b);
      row.appendChild(document.createTextNode(r.t === EARLY ? ' (부정출발)' : ` (${r.t} ms)`));
      body.appendChild(row);
    });
    const tag = document.createElement('div'); tag.style.marginTop = '8px';
    tag.innerHTML = `술래: <b style="color:${ps[loser].color}">${escapeHtml(ps[loser].name)}</b> 🐢`;
    body.appendChild(tag);
    ctx.showResult({
      title: '반응속도 순위 ⚡',
      bodyEl: body,
      actions: [
        { label: '다시', onClick: () => { ctx.hideResult(); reset(); } },
        { label: '홈', kind: 'secondary', onClick: () => { ctx.hideResult(); ctx.navigate('#/'); } },
      ],
    });
  }

  function reset() {
    times.fill(null); idx = 0; renderList(); ctx.mascot.setState('idle'); beginTurn();
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
