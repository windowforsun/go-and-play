let timer = null, cancelled = false;

export default {
  id: 'finger',
  name: '손가락 짚기',
  icon: '👆',
  type: 'pick-one',
  minPlayers: 2,
  mount(container, ctx) { this._c = container; cancelled = false; render(container, ctx); },
  unmount() { cancelled = true; if (timer) { clearTimeout(timer); timer = null; } if (this._c) this._c.innerHTML = ''; },
};

function render(container, ctx) {
  const ps = ctx.participants;
  const n = ps.length;
  let running = false;

  const panel = document.createElement('div');
  panel.className = 'game-panel';
  panel.innerHTML = '<h2>👆 손가락 짚기</h2><div class="hint">시작을 누르면 술래(당첨) 한 명이 뽑혀요</div>';

  const grid = document.createElement('div');
  grid.className = 'finger-grid';
  const dots = ps.map(p => {
    const d = document.createElement('div');
    d.className = 'finger-dot';
    d.style.background = p.color;
    d.textContent = p.name;
    grid.appendChild(d);
    return d;
  });

  const actions = document.createElement('div');
  actions.className = 'game-actions';
  actions.append(
    mkBtn('시작 👆', 'jelly-btn', start),
    mkBtn('홈', 'jelly-btn secondary', () => ctx.navigate('#/')),
  );

  panel.append(grid, actions);
  container.innerHTML = '';
  container.appendChild(panel);
  ctx.mascot.setState('idle');

  function start() {
    if (running || cancelled) return;
    running = true;
    ctx.mascot.setState('thinking');
    dots.forEach(d => d.classList.remove('on', 'win'));
    const winner = Math.floor(ctx.random.rng() * n);

    if (ctx.reducedMotion) { finish(winner); return; }

    const total = 2 * n + winner; // 마지막 스포트라이트가 winner에 오도록
    let step = 0;
    const tick = () => {
      if (cancelled) return;
      dots.forEach(d => d.classList.remove('on'));
      dots[step % n].classList.add('on');
      step++;
      if (step > total) { dots.forEach(d => d.classList.remove('on')); finish(winner); return; }
      const remain = total - step;
      const delay = remain > 8 ? 70 : remain > 3 ? 140 : 260; // 끝으로 갈수록 감속
      timer = setTimeout(tick, delay);
    };
    tick();
  }

  function finish(winner) {
    if (cancelled) return;
    running = false;
    dots[winner].classList.add('win');
    ctx.mascot.setState('celebrate');
    ctx.showResult({
      title: '술래 결정! 👆',
      bodyHtml: `<div style="font-size:22px">🎯 <b style="color:${ps[winner].color}">${escapeHtml(ps[winner].name)}</b> !</div>`,
      actions: [
        { label: '다시', onClick: () => { ctx.hideResult(); ctx.mascot.setState('idle'); start(); } },
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
