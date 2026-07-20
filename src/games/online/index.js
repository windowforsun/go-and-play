// 온라인 방(WebRTC/PeerJS). 방장이 방 코드를 만들고 참가자들이 코드로 접속.
// 방장이 게임을 고르면 모두의 폰에서 실시간으로 함께 겨룬다.
// 지원: 뽑기 / 온라인 탭 대결(손속도) / 온라인 반응속도(반응). 술래·승자 동기화.
// PeerJS 무료 클라우드 브로커를 시그널링에 사용(별도 서버/키 불필요).

const PEER_PREFIX = 'goandplay2026-';
const PALETTE = ['#ff3d84', '#38b6aa', '#ffd45c', '#a06bff', '#6db8ff', '#ff9a76', '#4fe0d0', '#ff6fae'];
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const TAP_TARGET = 40;

let cancelled = false;
let net = null;   // { peer, isHost, code, conns(Map), conn, players:[{id,name,color}], selfId }
let game = null;  // { mode, phase, counts:{}, times:{}, goAt, timers:[] }
let CTX = null, ROOT = null;

export default {
  id: 'online',
  name: '온라인',
  icon: '🌐',
  type: 'online',
  minPlayers: 1,
  mount(container, ctx) { ROOT = container; CTX = ctx; cancelled = false; net = null; game = null; renderMenu(); },
  unmount() { cancelled = true; clearGameTimers(); teardown(); if (ROOT) ROOT.innerHTML = ''; },
};

function teardown() { if (net && net.peer) { try { net.peer.destroy(); } catch { /* ignore */ } } net = null; }
function clearGameTimers() { if (game && game.timers) game.timers.forEach(t => clearTimeout(t)); if (game) game.timers = []; }

async function loadPeer() { const mod = await import('https://esm.sh/peerjs@1.5.4'); return mod.default || mod.Peer; }
function genCode() { let s = ''; for (let i = 0; i < 4; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]; return s; }
function mkBtn(text, cls, on) { const b = document.createElement('button'); b.className = cls; b.textContent = text; b.addEventListener('click', on); return b; }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function panelEl(title, hint) { const p = document.createElement('div'); p.className = 'game-panel'; p.innerHTML = `<h2>${title}</h2>` + (hint ? `<div class="hint">${hint}</div>` : ''); return p; }
function show(node) { ROOT.innerHTML = ''; ROOT.appendChild(node); }
function playerById(id) { return net.players.find(p => p.id === id); }

// 방장 → 전체 전송
function broadcast(msg) { if (!net || !net.conns) return; net.conns.forEach(c => { if (c.open) try { c.send(msg); } catch { /* ignore */ } }); }
// 게스트 → 방장 전송
function sendHost(msg) { if (net && net.conn && net.conn.open) try { net.conn.send(msg); } catch { /* ignore */ } }

// ── 메뉴 ──
function renderMenu() {
  clearGameTimers(); teardown();
  const panel = panelEl('🌐 온라인', '여러 폰이 방 코드로 접속해 실시간으로 함께!');
  const actions = document.createElement('div'); actions.className = 'game-actions online-menu';
  actions.append(
    mkBtn('방 만들기 🏠', 'jelly-btn', becomeHost),
    mkBtn('참가하기 🔑', 'jelly-btn secondary', renderGuestForm),
  );
  const home = document.createElement('div'); home.className = 'game-actions';
  home.append(mkBtn('홈', 'jelly-btn secondary', () => CTX.navigate('#/')));
  panel.append(actions, home);
  show(panel);
  CTX.mascot.setState('idle');
}

// ── 방장 ──
async function becomeHost() {
  const code = genCode();
  show(panelEl('🏠 방 만드는 중…', '잠시만요'));
  let Peer; try { Peer = await loadPeer(); } catch { return showError('PeerJS 로드 실패 (인터넷 확인)'); }
  if (cancelled) return;
  const peer = new Peer(PEER_PREFIX + code);
  net = { peer, isHost: true, code, conns: new Map(), players: [{ id: 'host', name: '방장', color: PALETTE[0] }], selfId: 'host' };
  peer.on('open', () => { if (!cancelled) renderLobby(); });
  peer.on('error', (e) => { if (!cancelled) showError('방 생성 오류: ' + (e && e.type ? e.type : e)); });
  peer.on('connection', (conn) => {
    conn.on('data', (d) => hostOnData(conn, d));
    conn.on('close', () => {
      if (cancelled || !net) return;
      net.players = net.players.filter(p => p.id !== conn.peer);
      net.conns.delete(conn.peer);
      broadcast({ type: 'players', players: net.players });
      if (!game || !game.mode) renderLobby();
    });
  });
}

function hostOnData(conn, d) {
  if (cancelled || !net || !d) return;
  if (d.type === 'join') {
    if (!net.players.some(p => p.id === conn.peer)) {
      net.players.push({ id: conn.peer, name: String(d.name || '참가자').slice(0, 12), color: PALETTE[net.players.length % PALETTE.length] });
    }
    net.conns.set(conn.peer, conn);
    broadcast({ type: 'players', players: net.players });
    if (!game || !game.mode) renderLobby();
  } else if (d.type === 'tap_hit') {
    if (game && game.mode === 'tap' && game.phase === 'go') { game.counts[conn.peer] = (game.counts[conn.peer] || 0) + 1; hostCheckTap(); }
  } else if (d.type === 'rx_tap') {
    if (game && game.mode === 'reaction' && game.phase !== 'done') hostRecordRx(conn.peer, d.ms);
  }
}

function renderLobby() {
  clearGameTimers();
  if (game) game.mode = null;
  const panel = panelEl('🏠 방 코드', '이 코드를 친구에게 알려주세요');
  const codeBox = document.createElement('div'); codeBox.className = 'online-code'; codeBox.textContent = net.code;
  panel.append(codeBox, playerListEl(net.players));
  const pick = document.createElement('div'); pick.className = 'online-games';
  pick.innerHTML = '<div class="online-players-title">방장이 게임 선택</div>';
  const row = document.createElement('div'); row.className = 'game-actions online-gamerow';
  row.append(
    mkBtn('뽑기 🎯', 'jelly-btn', hostPick),
    mkBtn('탭 대결 🔥', 'jelly-btn', () => hostStartTap()),
    mkBtn('반응속도 ⚡', 'jelly-btn', () => hostStartReaction()),
  );
  pick.appendChild(row);
  panel.appendChild(pick);
  const leave = document.createElement('div'); leave.className = 'game-actions';
  leave.append(mkBtn('나가기', 'jelly-btn secondary', renderMenu));
  panel.appendChild(leave);
  show(panel);
}

// ── 뽑기 ──
function hostPick() {
  if (!net || net.players.length < 1) return;
  const w = net.players[Math.floor(Math.random() * net.players.length)];
  broadcast({ type: 'result', name: w.name, color: w.color });
  showPick(w);
}

// ── 온라인 탭 대결 ──
function hostStartTap() {
  game = { mode: 'tap', phase: 'countdown', counts: {}, timers: [] };
  net.players.forEach(p => game.counts[p.id] = 0);
  broadcast({ type: 'game', mode: 'tap' });
  renderTap();
  runCountdown(() => {
    if (cancelled || !game || game.mode !== 'tap') return;
    game.phase = 'go';
    broadcast({ type: 'tap_go' });
    setTapOverlay('');
    game.timers.push(setInterval(() => { if (game && game.phase === 'go') broadcast({ type: 'tap_state', counts: game.counts }); }, 120));
  });
}
function runCountdown(done) {
  let c = 3;
  broadcast({ type: 'cd', n: c }); setCountOverlay(c);
  const step = () => {
    if (cancelled || !game) return;
    c--;
    if (c > 0) { broadcast({ type: 'cd', n: c }); setCountOverlay(c); game.timers.push(setTimeout(step, 700)); }
    else { broadcast({ type: 'cd', n: 0 }); setCountOverlay('GO!'); game.timers.push(setTimeout(done, 500)); }
  };
  game.timers.push(setTimeout(step, 700));
}
function hostCheckTap() {
  updateTapBars(game.counts);
  const leader = net.players.find(p => (game.counts[p.id] || 0) >= TAP_TARGET);
  if (leader) hostEndTap();
}
function hostEndTap() {
  game.phase = 'done';
  clearGameTimers();
  let winner = net.players[0], loser = net.players[0];
  net.players.forEach(p => {
    if ((game.counts[p.id] || 0) > (game.counts[winner.id] || 0)) winner = p;
    if ((game.counts[p.id] || 0) < (game.counts[loser.id] || 0)) loser = p;
  });
  const payload = { type: 'tap_end', counts: game.counts, winner: winner.name, winnerColor: winner.color, loser: loser.name, loserColor: loser.color };
  broadcast(payload);
  updateTapBars(game.counts);
  showTapResult(payload);
}

// ── 온라인 반응속도 ──
function hostStartReaction() {
  game = { mode: 'reaction', phase: 'wait', times: {}, timers: [] };
  broadcast({ type: 'game', mode: 'reaction' });
  broadcast({ type: 'rx_wait' });
  renderReaction('wait');
  const delay = 1500 + Math.floor(Math.random() * 3000);
  game.timers.push(setTimeout(() => {
    if (cancelled || !game || game.mode !== 'reaction') return;
    game.phase = 'go'; game.goAt = performance.now();
    broadcast({ type: 'rx_go' });
    renderReaction('go');
    game.timers.push(setTimeout(() => { if (game && game.phase === 'go') hostEndReaction(); }, 6000)); // 미응답 타임아웃
  }, delay));
}
function hostRecordRx(id, ms) {
  if (game.times[id] === undefined) game.times[id] = ms;
  const answered = net.players.filter(p => game.times[p.id] !== undefined).length;
  if (answered >= net.players.length) hostEndReaction();
}
function hostEndReaction() {
  if (!game || game.phase === 'done') return;
  game.phase = 'done'; clearGameTimers();
  const ranked = net.players
    .map(p => ({ name: p.name, color: p.color, ms: game.times[p.id] === undefined ? Infinity : game.times[p.id] }))
    .sort((a, b) => a.ms - b.ms);
  const loser = ranked[ranked.length - 1];
  const payload = { type: 'rx_end', ranking: ranked.map(r => ({ name: r.name, color: r.color, ms: r.ms === Infinity ? null : r.ms })), loser: loser.name, loserColor: loser.color };
  broadcast(payload);
  showRxResult(payload);
}

// ── 게스트 ──
function renderGuestForm() {
  teardown();
  const panel = panelEl('🔑 참가하기', '방 코드와 이름을 입력하세요');
  const form = document.createElement('div'); form.className = 'online-form';
  const codeIn = document.createElement('input'); codeIn.className = 'online-input'; codeIn.placeholder = '방 코드 (예: ABCD)'; codeIn.maxLength = 4; codeIn.style.textTransform = 'uppercase';
  const nameIn = document.createElement('input'); nameIn.className = 'online-input'; nameIn.placeholder = '내 이름'; nameIn.maxLength = 12;
  form.append(codeIn, nameIn);
  const actions = document.createElement('div'); actions.className = 'game-actions';
  actions.append(
    mkBtn('입장 🚪', 'jelly-btn', () => { const code = codeIn.value.trim().toUpperCase(); const name = nameIn.value.trim() || '참가자'; if (code.length === 4) becomeGuest(code, name); }),
    mkBtn('뒤로', 'jelly-btn secondary', renderMenu),
  );
  panel.append(form, actions);
  show(panel);
}

async function becomeGuest(code, name) {
  show(panelEl('🔑 접속 중…', `방 ${esc(code)}`));
  let Peer; try { Peer = await loadPeer(); } catch { return showError('PeerJS 로드 실패 (인터넷 확인)'); }
  if (cancelled) return;
  const peer = new Peer();
  net = { peer, isHost: false, code, conn: null, players: [], selfId: null };
  peer.on('open', (id) => {
    net.selfId = id;
    const conn = peer.connect(PEER_PREFIX + code, { reliable: true });
    net.conn = conn;
    const failTimer = setTimeout(() => { if (!cancelled && !conn.open) showError('연결 실패 — 코드를 확인하세요'); }, 8000);
    conn.on('open', () => { clearTimeout(failTimer); conn.send({ type: 'join', name }); renderGuestLobby(); });
    conn.on('data', guestOnData);
    conn.on('close', () => { if (!cancelled) showError('방과의 연결이 끊겼습니다'); });
  });
  peer.on('error', (e) => { if (!cancelled) showError('연결 오류: ' + (e && e.type ? e.type : e)); });
}

function guestOnData(d) {
  if (cancelled || !d) return;
  if (d.type === 'players') { net.players = d.players; if (!game || !game.mode) renderGuestLobby(); }
  else if (d.type === 'result') showPick({ name: d.name, color: d.color });
  else if (d.type === 'game') { game = { mode: d.mode, phase: d.mode === 'reaction' ? 'wait' : 'countdown', timers: [] }; if (d.mode === 'tap') renderTap(); else renderReaction('wait'); }
  else if (d.type === 'cd') { if (game && game.mode === 'tap') setCountOverlay(d.n === 0 ? 'GO!' : d.n); }
  else if (d.type === 'tap_go') { if (game) { game.phase = 'go'; setTapOverlay(''); } }
  else if (d.type === 'tap_state') updateTapBars(d.counts);
  else if (d.type === 'tap_end') { if (game) game.phase = 'done'; updateTapBars(d.counts); showTapResult(d); }
  else if (d.type === 'rx_wait') { game = { mode: 'reaction', phase: 'wait', timers: [] }; renderReaction('wait'); }
  else if (d.type === 'rx_go') { if (game) { game.phase = 'go'; game.goAt = performance.now(); renderReaction('go'); } }
  else if (d.type === 'rx_end') { if (game) game.phase = 'done'; showRxResult(d); }
}

function renderGuestLobby() {
  const panel = panelEl('🔑 대기실', '방장이 게임을 시작하면 함께 겨뤄요');
  panel.append(playerListEl(net.players));
  const actions = document.createElement('div'); actions.className = 'game-actions';
  actions.append(mkBtn('나가기', 'jelly-btn secondary', renderMenu));
  panel.appendChild(actions);
  show(panel);
}

// ── 게임 화면(호스트·게스트 공용) ──
function renderTap() {
  const panel = panelEl('🔥 온라인 탭 대결', '내 버튼을 미친듯이 연타! 제일 적게 친 사람이 술래');
  const stage = document.createElement('div'); stage.className = 'tap-stage';
  const myBtn = document.createElement('div'); myBtn.className = 'online-tapbtn'; myBtn.id = 'ol-tapbtn'; myBtn.textContent = 'TAP!';
  myBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); onMyTap(); });
  const overlay = document.createElement('div'); overlay.className = 'tap-overlay show'; overlay.id = 'ol-overlay'; overlay.textContent = '준비!';
  stage.append(myBtn, overlay);
  const bars = document.createElement('div'); bars.className = 'online-bars'; bars.id = 'ol-bars';
  panel.append(stage, bars);
  show(panel);
  updateTapBars({});
}
function onMyTap() {
  if (!game || game.mode !== 'tap' || game.phase !== 'go') return;
  if (net.isHost) { game.counts.host = (game.counts.host || 0) + 1; hostCheckTap(); }
  else sendHost({ type: 'tap_hit' });
}
function updateTapBars(counts) {
  const bars = document.getElementById('ol-bars'); if (!bars) return;
  bars.innerHTML = '';
  net.players.forEach(p => {
    const c = counts[p.id] || 0;
    const row = document.createElement('div'); row.className = 'online-bar-row';
    const nm = document.createElement('span'); nm.className = 'online-bar-name'; nm.textContent = p.name;
    const track = document.createElement('div'); track.className = 'online-bar-track';
    const fill = document.createElement('div'); fill.className = 'online-bar-fill'; fill.style.width = Math.min(100, c / TAP_TARGET * 100) + '%'; fill.style.background = p.color;
    const num = document.createElement('span'); num.className = 'online-bar-num'; num.textContent = c;
    track.appendChild(fill); row.append(nm, track, num); bars.appendChild(row);
  });
}
function setCountOverlay(v) { const o = document.getElementById('ol-overlay'); if (o) { o.textContent = v; o.classList.add('show'); } }
function setTapOverlay(v) { const o = document.getElementById('ol-overlay'); if (o) { o.textContent = v; if (!v) o.classList.remove('show'); } }

function renderReaction(phase) {
  const existing = document.getElementById('ol-pad');
  if (existing) { applyRxPad(existing, phase); return; }
  const panel = panelEl('⚡ 온라인 반응속도', '초록이 되면 최대한 빨리 탭! 제일 느린 사람이 술래');
  const pad = document.createElement('div'); pad.className = 'reaction-pad'; pad.id = 'ol-pad';
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); onRxTap(); });
  panel.appendChild(pad);
  show(panel);
  applyRxPad(pad, phase);
}
function applyRxPad(pad, phase) {
  if (phase === 'wait') { pad.className = 'reaction-pad waiting'; pad.textContent = '대기…'; }
  else if (phase === 'go') { pad.className = 'reaction-pad go'; pad.textContent = '지금! 탭!'; }
}
function onRxTap() {
  if (!game || game.mode !== 'reaction') return;
  if (game.phase === 'wait') { report(Infinity); return; }   // 부정출발
  if (game.phase === 'go') { const ms = Math.round(performance.now() - game.goAt); game.phase = 'reported'; report(ms); }
}
function report(ms) {
  const pad = document.getElementById('ol-pad'); if (pad) { pad.className = 'reaction-pad'; pad.textContent = ms === Infinity ? '부정출발! ❌' : `${ms} ms — 대기중`; }
  if (net.isHost) hostRecordRx('host', ms); else sendHost({ type: 'rx_tap', ms });
}

// ── 공용 결과 ──
function playerListEl(players) {
  const wrap = document.createElement('div'); wrap.className = 'online-players';
  const title = document.createElement('div'); title.className = 'online-players-title'; title.textContent = `접속: ${players.length}명`;
  wrap.appendChild(title);
  players.forEach(p => { const chip = document.createElement('span'); chip.className = 'online-chip'; chip.style.background = p.color; chip.textContent = p.name; wrap.appendChild(chip); });
  return wrap;
}
function backActions() {
  return [
    { label: net && net.isHost ? '대기실로' : '확인', onClick: () => { CTX.hideResult(); CTX.mascot.setState('idle'); if (net && net.isHost) renderLobby(); else renderGuestLobby(); } },
  ];
}
function showPick(w) {
  CTX.mascot.setState('celebrate');
  const body = document.createElement('div'); body.style.fontSize = '24px';
  const b = document.createElement('b'); b.style.color = w.color; b.textContent = w.name;
  body.append(document.createTextNode('🎯 '), b, document.createTextNode(' 당첨!'));
  CTX.showResult({ title: '온라인 뽑기 🌐', bodyEl: body, actions: backActions() });
}
function showTapResult(d) {
  CTX.mascot.setState('celebrate');
  const body = document.createElement('div');
  const w = document.createElement('div'); w.style.fontSize = '20px'; w.style.margin = '4px 0';
  const wb = document.createElement('b'); wb.style.color = d.winnerColor; wb.textContent = d.winner;
  w.append(document.createTextNode('🏆 우승 '), wb);
  const l = document.createElement('div'); l.style.fontSize = '20px'; l.style.margin = '4px 0';
  const lb = document.createElement('b'); lb.style.color = d.loserColor; lb.textContent = d.loser;
  l.append(document.createTextNode('🐢 술래 '), lb);
  body.append(w, l);
  CTX.showResult({ title: '탭 대결 결과 🔥', bodyEl: body, actions: backActions() });
}
function showRxResult(d) {
  CTX.mascot.setState('celebrate');
  const body = document.createElement('div');
  d.ranking.forEach((r, k) => {
    const row = document.createElement('div'); row.style.margin = '4px 0';
    const b = document.createElement('b'); b.style.color = r.color; b.textContent = r.name;
    row.append(document.createTextNode(`${k + 1}등 — `), b, document.createTextNode(r.ms == null ? ' (부정출발)' : ` (${r.ms} ms)`));
    body.appendChild(row);
  });
  const tag = document.createElement('div'); tag.style.marginTop = '8px';
  const lb = document.createElement('b'); lb.style.color = d.loserColor; lb.textContent = d.loser;
  tag.append(document.createTextNode('술래: '), lb, document.createTextNode(' 🐢'));
  body.appendChild(tag);
  CTX.showResult({ title: '반응속도 결과 ⚡', bodyEl: body, actions: backActions() });
}

function showError(msg) {
  clearGameTimers(); teardown();
  const panel = panelEl('⚠️ 오류', esc(msg));
  const actions = document.createElement('div'); actions.className = 'game-actions';
  actions.append(mkBtn('다시', 'jelly-btn', renderMenu), mkBtn('홈', 'jelly-btn secondary', () => CTX.navigate('#/')));
  panel.appendChild(actions);
  show(panel);
}
