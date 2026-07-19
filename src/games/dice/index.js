import { rollDice, rankByValue } from './dice.logic.js';

const FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
let timer = null, cancelled = false;

export default {
  id: 'dice',
  name: '주사위',
  icon: '🎲',
  type: 'order',
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
  panel.innerHTML = '<h2>🎲 주사위</h2><div class="hint">굴려서 높은 숫자 순으로 순위!</div>';

  const grid = document.createElement('div');
  grid.className = 'dice-grid';
  const cells = ps.map(p => {
    const cell = document.createElement('div');
    cell.className = 'dice-cell';
    const face = document.createElement('div');
    face.className = 'dice-face'; face.textContent = '⚀';
    const name = document.createElement('div');
    name.className = 'dice-name'; name.style.background = p.color; name.textContent = p.name;
    const rank = document.createElement('div');
    rank.className = 'dice-rank';
    cell.append(face, name, rank);
    grid.appendChild(cell);
    return { face, rank };
  });

  const actions = document.createElement('div');
  actions.className = 'game-actions';
  actions.append(
    mkBtn('굴리기 🎲', 'jelly-btn', roll),
    mkBtn('홈', 'jelly-btn secondary', () => ctx.navigate('#/')),
  );

  panel.append(grid, actions);
  container.innerHTML = '';
  container.appendChild(panel);
  ctx.mascot.setState('idle');

  function roll() {
    if (running || cancelled) return;
    running = true;
    ctx.mascot.setState('thinking');
    cells.forEach(c => { c.rank.textContent = ''; c.face.classList.add('rolling'); });
    const values = rollDice(n, ctx.random.rng);

    if (ctx.reducedMotion) { finish(values); return; }

    let steps = 0;
    const tick = () => {
      if (cancelled) return;
      if (steps < 12) {
        cells.forEach((c, i) => { c.face.textContent = FACES[1 + ((steps + i) % 6)]; });
        steps++;
        timer = setTimeout(tick, 90);
      } else {
        finish(values);
      }
    };
    tick();
  }

  function finish(values) {
    if (cancelled) return;
    running = false;
    cells.forEach((c, i) => { c.face.classList.remove('rolling'); c.face.textContent = FACES[values[i]]; });
    const ranked = rankByValue(values);
    ranked.forEach(r => { cells[r.index].rank.textContent = r.rank + '등'; });
    ctx.mascot.setState('celebrate');
    const body = document.createElement('div');
    ranked.forEach(r => {
      const row = document.createElement('div');
      row.style.margin = '5px 0';
      const b = document.createElement('b');
      b.style.color = ps[r.index].color;
      b.textContent = ps[r.index].name;
      row.appendChild(document.createTextNode(`${r.rank}등 — `));
      row.appendChild(b);
      row.appendChild(document.createTextNode(` (${FACES[r.value]} ${r.value})`));
      body.appendChild(row);
    });
    ctx.showResult({
      title: '주사위 순위 🎲',
      bodyEl: body,
      actions: [
        { label: '다시 굴리기', onClick: () => { ctx.hideResult(); ctx.mascot.setState('idle'); roll(); } },
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
