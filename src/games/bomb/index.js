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
  const SIZE = 300, CX = 150, CY = 150, RING = 108;
  let holder = 0;
  let armed = false;

  const panel = document.createElement('div');
  panel.className = 'game-panel';
  panel.innerHTML = '<h2>💣 폭탄 돌리기</h2><div class="hint">시작하면 히든 타이머 작동! 재빨리 옆으로 패스, 터질 때 든 사람이 술래</div>';

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
    seat.addEventListener('click', () => { if (armed) pass(); }); // 자기 자리를 눌러 넘기기도 가능
    stage.appendChild(seat);
    return { seat, x, y };
  });

  const bomb = document.createElement('div');
  bomb.className = 'bomb-icon';
  bomb.textContent = '💣';
  stage.appendChild(bomb);

  const actions = document.createElement('div');
  actions.className = 'game-actions';
  const mainBtn = mkBtn('시작 💣', 'jelly-btn', onMain);
  const homeBtn = mkBtn('홈', 'jelly-btn secondary', () => ctx.navigate('#/'));
  actions.append(mainBtn, homeBtn);

  panel.append(stage, actions);
  container.innerHTML = '';
  container.appendChild(panel);
  ctx.mascot.setState('idle');
  place();

  function place() {
    seats.forEach((s, i) => s.seat.classList.toggle('on', i === holder && armed));
    bomb.style.left = seats[holder].x + 'px';
    bomb.style.top = seats[holder].y + 'px';
  }

  function onMain() { if (!armed) start(); else pass(); }

  function start() {
    armed = true;
    seats.forEach(s => s.seat.classList.remove('boom'));
    bomb.textContent = '💣';
    bomb.classList.add('lit');
    holder = Math.floor(ctx.random.rng() * n);
    place();
    mainBtn.textContent = '패스 ➡️';
    ctx.mascot.setState('thinking');
    const fuse = 4000 + Math.floor(ctx.random.rng() * 8000); // 4~12초, 숨김
    timer = setTimeout(explode, fuse);
  }

  function pass() {
    if (!armed || cancelled) return;
    holder = (holder + 1) % n;
    place();
  }

  function explode() {
    if (cancelled) return;
    armed = false;
    bomb.classList.remove('lit');
    seats.forEach(s => s.seat.classList.remove('on'));
    seats[holder].seat.classList.add('boom');
    bomb.textContent = '💥';
    mainBtn.textContent = '다시 💣';
    ctx.mascot.setState('celebrate');
    ctx.showResult({
      title: '펑! 💥',
      bodyHtml: `<div style="font-size:22px">술래는 <b style="color:${ps[holder].color}">${escapeHtml(ps[holder].name)}</b>!</div>`,
      actions: [
        { label: '다시', onClick: () => { ctx.hideResult(); start(); } },
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
