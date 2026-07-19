let timer = null, cancelled = false;

export default {
  id: 'bomb',
  name: '폭탄 돌리기',
  icon: '💣',
  type: 'pick-one',
  minPlayers: 2,
  mount(container, ctx) { this._c = container; cancelled = false; render(container, ctx); },
  unmount() { cancelled = true; if (timer) { clearTimeout(timer); timer = null; } if (this._c) this._c.innerHTML = ''; },
};

function render(container, ctx) {
  const ps = ctx.participants;
  const n = ps.length;
  let running = false;

  const SIZE = 300, CX = 150, CY = 150, RING = 108;

  const panel = document.createElement('div');
  panel.className = 'game-panel';
  panel.innerHTML = '<h2>💣 폭탄 돌리기</h2><div class="hint">돌리다 터지는 순간 든 사람이 술래!</div>';

  const stage = document.createElement('div');
  stage.className = 'bomb-stage';
  stage.style.width = SIZE + 'px'; stage.style.height = SIZE + 'px';

  const seats = ps.map((p, i) => {
    const ang = (-90 + i * 360 / n) * Math.PI / 180;
    const x = CX + RING * Math.cos(ang);
    const y = CY + RING * Math.sin(ang);
    const seat = document.createElement('div');
    seat.className = 'bomb-seat';
    seat.style.left = x + 'px'; seat.style.top = y + 'px';
    seat.style.background = p.color;
    seat.textContent = p.name;
    stage.appendChild(seat);
    return { seat, x, y };
  });

  const bomb = document.createElement('div');
  bomb.className = 'bomb-icon';
  bomb.textContent = '💣';
  bomb.style.left = seats[0].x + 'px'; bomb.style.top = seats[0].y + 'px';
  stage.appendChild(bomb);

  const actions = document.createElement('div');
  actions.className = 'game-actions';
  actions.append(
    mkBtn('시작 💣', 'jelly-btn', start),
    mkBtn('홈', 'jelly-btn secondary', () => ctx.navigate('#/')),
  );

  panel.append(stage, actions);
  container.innerHTML = '';
  container.appendChild(panel);
  ctx.mascot.setState('idle');

  function moveTo(idx) {
    seats.forEach(s => s.seat.classList.remove('on'));
    seats[idx].seat.classList.add('on');
    bomb.style.left = seats[idx].x + 'px';
    bomb.style.top = seats[idx].y + 'px';
  }

  function start() {
    if (running || cancelled) return;
    running = true;
    ctx.mascot.setState('thinking');
    seats.forEach(s => s.seat.classList.remove('boom', 'on'));
    const victim = Math.floor(ctx.random.rng() * n);

    if (ctx.reducedMotion) { boom(victim); return; }

    const total = 3 * n + victim; // 몇 바퀴 돈 뒤 victim에서 정지
    let step = 0;
    const tick = () => {
      if (cancelled) return;
      moveTo(step % n);
      step++;
      if (step > total) { boom(victim); return; }
      const remain = total - step;
      const delay = remain > 8 ? 95 : remain > 3 ? 170 : 300; // 감속
      timer = setTimeout(tick, delay);
    };
    tick();
  }

  function boom(victim) {
    if (cancelled) return;
    running = false;
    seats.forEach(s => s.seat.classList.remove('on'));
    seats[victim].seat.classList.add('boom');
    bomb.textContent = '💥';
    bomb.style.left = seats[victim].x + 'px';
    bomb.style.top = seats[victim].y + 'px';
    ctx.mascot.setState('celebrate');
    ctx.showResult({
      title: '펑! 💥',
      bodyHtml: `<div style="font-size:22px">술래는 <b style="color:${ps[victim].color}">${escapeHtml(ps[victim].name)}</b>!</div>`,
      actions: [
        { label: '다시', onClick: () => { ctx.hideResult(); bomb.textContent = '💣'; ctx.mascot.setState('idle'); start(); } },
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
