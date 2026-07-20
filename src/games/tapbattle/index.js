const TARGET = 30; // 먼저 이만큼 탭하면 승리

let timer = null, cancelled = false;

export default {
  id: 'tapbattle',
  name: '동시 탭 대결',
  icon: '🔥',
  type: 'contest',
  minPlayers: 2,
  mount(container, ctx) { this._c = container; cancelled = false; render(container, ctx); },
  unmount() { cancelled = true; if (timer) { clearTimeout(timer); timer = null; } if (this._c) this._c.innerHTML = ''; },
};

function render(container, ctx) {
  const ps = ctx.participants;
  const n = ps.length;
  let counts = new Array(n).fill(0);
  let phase = 'idle';   // idle | countdown | go | done
  let winner = -1;

  const panel = document.createElement('div');
  panel.className = 'game-panel';
  panel.innerHTML = '<h2>🔥 동시 탭 대결</h2><div class="hint">GO! 신호에 각자 자기 칸을 미친듯이 연타 — 먼저 꽉 채우면 승리!</div>';

  const grid = document.createElement('div');
  grid.className = 'tap-grid';
  const zones = ps.map((p, i) => {
    const zone = document.createElement('div');
    zone.className = 'tap-zone';
    zone.style.background = p.color;
    const fill = document.createElement('div'); fill.className = 'tap-fill';
    const lbl = document.createElement('div'); lbl.className = 'tap-lbl'; lbl.textContent = p.name;
    const cnt = document.createElement('div'); cnt.className = 'tap-count'; cnt.textContent = '0';
    zone.append(fill, lbl, cnt);
    const hit = (e) => { e.preventDefault(); tap(i); };
    zone.addEventListener('pointerdown', hit);        // 마우스+터치, 멀티터치는 각 손가락이 별도 pointerdown
    grid.appendChild(zone);
    return { zone, fill, cnt };
  });

  const overlay = document.createElement('div');
  overlay.className = 'tap-overlay';

  const actions = document.createElement('div');
  actions.className = 'game-actions';
  const startBtn = mkBtn('시작 🔥', 'jelly-btn', startCountdown);
  actions.append(startBtn, mkBtn('홈', 'jelly-btn secondary', () => ctx.navigate('#/')));

  const stage = document.createElement('div');
  stage.className = 'tap-stage';
  stage.append(grid, overlay);

  panel.append(stage, actions);
  container.innerHTML = '';
  container.appendChild(panel);
  ctx.mascot.setState('idle');
  overlay.textContent = '준비되면 시작!';

  function tap(i) {
    if (phase !== 'go' || cancelled) return;
    counts[i]++;
    zones[i].cnt.textContent = counts[i];
    zones[i].fill.style.height = Math.min(100, counts[i] / TARGET * 100) + '%';
    if (counts[i] >= TARGET && winner < 0) finish(i);
  }

  function startCountdown() {
    if (phase === 'countdown' || phase === 'go' || cancelled) return;
    counts = new Array(n).fill(0);
    winner = -1;
    zones.forEach(z => { z.cnt.textContent = '0'; z.fill.style.height = '0%'; z.zone.classList.remove('win'); });
    phase = 'countdown';
    startBtn.disabled = true;
    ctx.mascot.setState('thinking');
    let c = 3;
    overlay.textContent = c;
    overlay.classList.add('show');
    const tick = () => {
      if (cancelled) return;
      c--;
      if (c > 0) { overlay.textContent = c; timer = setTimeout(tick, 700); }
      else { overlay.textContent = 'GO!'; phase = 'go'; timer = setTimeout(() => { if (!cancelled) overlay.classList.remove('show'); }, 500); }
    };
    timer = setTimeout(tick, 700);
  }

  function finish(i) {
    winner = i;
    phase = 'done';
    startBtn.disabled = false;
    startBtn.textContent = '다시 🔥';
    zones[i].zone.classList.add('win');
    ctx.mascot.setState('celebrate');
    ctx.showResult({
      title: '승리! 🔥',
      bodyHtml: `<div style="font-size:24px">🏆 <b style="color:${ps[i].color}">${escapeHtml(ps[i].name)}</b> 우승!</div>`,
      actions: [
        { label: '다시', onClick: () => { ctx.hideResult(); ctx.mascot.setState('idle'); overlay.textContent = '준비되면 시작!'; overlay.classList.add('show'); startCountdown(); } },
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
