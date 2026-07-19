let cancelled = false;

const TEAM_COLORS = ['#ff5c8a', '#38b6aa', '#6db8ff', '#ffd45c'];
const TEAM_LABEL = ['A팀', 'B팀', 'C팀', 'D팀'];

export default {
  id: 'draw',
  name: '제비뽑기',
  icon: '🎴',
  type: 'assign',
  minPlayers: 2,
  mount(container, ctx) { this._c = container; cancelled = false; render(container, ctx); },
  unmount() { cancelled = true; if (this._c) this._c.innerHTML = ''; },
};

function render(container, ctx) {
  const ps = ctx.participants;
  const n = ps.length;
  let mode = 'win';                 // 'win'(당첨 뽑기) | 'team'(팀 나누기)
  let teamCount = Math.min(2, n);
  let assign = [];                  // { text, color } per participant
  const cards = [];
  const revealed = new Set();

  const panel = document.createElement('div');
  panel.className = 'game-panel';
  panel.innerHTML = '<h2>🎴 제비뽑기</h2>';

  // 모드 바
  const bar = document.createElement('div');
  bar.className = 'draw-modebar';
  const winBtn = mkBtn('당첨 뽑기', 'mode-btn', () => setMode('win'));
  const teamBtn = mkBtn('팀 나누기', 'mode-btn', () => setMode('team'));
  const teamCtl = document.createElement('span');
  teamCtl.className = 'draw-teamctl';
  const minus = mkBtn('−', 'mode-step', () => setTeams(teamCount - 1));
  const teamNum = document.createElement('span'); teamNum.className = 'draw-teamnum';
  const plus = mkBtn('+', 'mode-step', () => setTeams(teamCount + 1));
  teamCtl.append(document.createTextNode('팀 수 '), minus, teamNum, plus);
  bar.append(winBtn, teamBtn, teamCtl);

  const hint = document.createElement('div'); hint.className = 'hint';

  const grid = document.createElement('div');
  grid.className = 'draw-grid';

  ps.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'draw-card';
    const inner = document.createElement('div');
    inner.className = 'draw-inner';
    const back = document.createElement('div');
    back.className = 'draw-face draw-back';
    back.innerHTML = '<div style="font-size:26px">🎴</div>';
    const backName = document.createElement('div');
    backName.className = 'draw-name'; backName.style.color = '#fff'; backName.textContent = p.name;
    back.appendChild(backName);
    const front = document.createElement('div');
    front.className = 'draw-face draw-front';
    const res = document.createElement('div');
    res.style.fontSize = '15px';
    const frontName = document.createElement('div');
    frontName.className = 'draw-name'; frontName.style.color = 'rgba(255,255,255,.9)'; frontName.textContent = p.name;
    front.append(res, frontName);
    inner.append(back, front);
    card.appendChild(inner);
    card.addEventListener('click', () => reveal(i));
    grid.appendChild(card);
    cards.push({ card, res, front });
  });

  const actions = document.createElement('div');
  actions.className = 'game-actions';
  actions.append(
    mkBtn('전체 공개', 'jelly-btn', revealAll),
    mkBtn('리셋 🔄', 'jelly-btn secondary', deal),
    mkBtn('홈', 'jelly-btn secondary', () => ctx.navigate('#/')),
  );

  panel.append(bar, hint, grid, actions);
  container.innerHTML = '';
  container.appendChild(panel);
  setMode('win');

  function setMode(m) {
    mode = m;
    winBtn.classList.toggle('on', m === 'win');
    teamBtn.classList.toggle('on', m === 'team');
    teamCtl.style.display = m === 'team' ? 'inline-flex' : 'none';
    hint.textContent = m === 'win' ? '카드를 눌러 뒤집어 보세요 (당첨 1개)' : '카드를 뒤집으면 배정된 팀이 나와요';
    deal();
  }

  function setTeams(t) {
    teamCount = Math.max(2, Math.min(4, Math.min(n, t)));
    teamNum.textContent = teamCount;
    if (mode === 'team') deal();
  }

  function deal() {
    if (cancelled) return;
    if (mode === 'win') {
      const items = ['당첨 🎉', ...Array(Math.max(0, n - 1)).fill('꽝')];
      const shuffled = ctx.random.shuffle(items);
      assign = shuffled.map(t => ({ text: t, color: null }));
    } else {
      const order = ctx.random.shuffle(ps.map((_, i) => i)); // 참가자 인덱스 섞기
      const team = new Array(n);
      order.forEach((pi, k) => { team[pi] = k % teamCount; }); // 라운드로빈 균등 분배
      assign = team.map(t => ({ text: TEAM_LABEL[t], color: TEAM_COLORS[t] }));
    }
    revealed.clear();
    teamNum.textContent = teamCount;
    cards.forEach((c, i) => {
      c.card.classList.remove('flipped');
      c.res.textContent = assign[i].text;
      c.front.style.background = assign[i].color || ps[i].color;
    });
    ctx.mascot.setState('idle');
  }

  function reveal(i) {
    if (cancelled || revealed.has(i)) return;
    cards[i].card.classList.add('flipped');
    revealed.add(i);
    if (mode === 'win' && assign[i].text.startsWith('당첨')) ctx.mascot.setState('celebrate');
    if (revealed.size === n) ctx.mascot.setState('celebrate');
  }

  function revealAll() { for (let i = 0; i < n; i++) reveal(i); }
}

function mkBtn(text, cls, on) {
  const b = document.createElement('button');
  b.className = cls; b.textContent = text; b.addEventListener('click', on);
  return b;
}
