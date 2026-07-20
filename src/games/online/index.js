// 온라인 방(WebRTC/PeerJS). 방장이 방 코드를 만들고, 참가자들이 코드로 접속.
// 방장이 "뽑기"를 누르면 접속한 모두의 폰에 동시에 결과가 뜬다.
// PeerJS 무료 클라우드 브로커를 시그널링에 사용(별도 서버/키 불필요).

const PEER_PREFIX = 'goandplay2026-';
const PALETTE = ['#ff3d84', '#38b6aa', '#ffd45c', '#a06bff', '#6db8ff', '#ff9a76', '#4fe0d0', '#ff6fae'];
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

let cancelled = false;
let net = null;

export default {
  id: 'online',
  name: '온라인',
  icon: '🌐',
  type: 'online',
  minPlayers: 1,
  mount(container, ctx) { this._c = container; cancelled = false; net = null; renderMenu(container, ctx); },
  unmount() { cancelled = true; teardown(); if (this._c) this._c.innerHTML = ''; },
};

function teardown() {
  if (net && net.peer) { try { net.peer.destroy(); } catch { /* ignore */ } }
  net = null;
}

async function loadPeer() {
  const mod = await import('https://esm.sh/peerjs@1.5.4');
  return mod.default || mod.Peer;
}

function genCode() {
  let s = '';
  for (let i = 0; i < 4; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

function panelEl(title, hintHtml) {
  const p = document.createElement('div');
  p.className = 'game-panel';
  p.innerHTML = `<h2>${title}</h2>` + (hintHtml ? `<div class="hint">${hintHtml}</div>` : '');
  return p;
}

function mkBtn(text, cls, on) {
  const b = document.createElement('button');
  b.className = cls; b.textContent = text; b.addEventListener('click', on);
  return b;
}

function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// ── 메뉴 ──
function renderMenu(container, ctx) {
  teardown();
  const panel = panelEl('🌐 온라인', '여러 폰이 방 코드로 접속해 함께 즐겨요');
  const actions = document.createElement('div');
  actions.className = 'game-actions online-menu';
  actions.append(
    mkBtn('방 만들기 🏠', 'jelly-btn', () => becomeHost(container, ctx)),
    mkBtn('참가하기 🔑', 'jelly-btn secondary', () => renderGuestForm(container, ctx)),
  );
  const home = document.createElement('div'); home.className = 'game-actions';
  home.append(mkBtn('홈', 'jelly-btn secondary', () => ctx.navigate('#/')));
  panel.append(actions, home);
  container.innerHTML = '';
  container.appendChild(panel);
  ctx.mascot.setState('idle');
}

// ── 방장(호스트) ──
async function becomeHost(container, ctx) {
  const code = genCode();
  const panel = panelEl('🏠 방 만드는 중…', '잠시만요');
  container.innerHTML = ''; container.appendChild(panel);
  let Peer;
  try { Peer = await loadPeer(); } catch { return showError(container, ctx, 'PeerJS 로드 실패 (인터넷 확인)'); }
  if (cancelled) return;
  const peer = new Peer(PEER_PREFIX + code);
  net = { peer, isHost: true, code, conns: new Map(), players: [{ id: 'host', name: '방장', color: PALETTE[0] }] };

  peer.on('open', () => { if (!cancelled) renderHostLobby(container, ctx); });
  peer.on('error', (e) => { if (!cancelled) showError(container, ctx, '방 생성 오류: ' + (e && e.type ? e.type : e)); });
  peer.on('connection', (conn) => {
    conn.on('open', () => {});
    conn.on('data', (d) => {
      if (cancelled) return;
      if (d && d.type === 'join') {
        const color = PALETTE[net.players.length % PALETTE.length];
        net.players.push({ id: conn.peer, name: String(d.name || '참가자').slice(0, 12), color });
        net.conns.set(conn.peer, conn);
        broadcastPlayers();
        renderHostLobby(container, ctx);
      }
    });
    conn.on('close', () => {
      if (cancelled) return;
      net.players = net.players.filter(p => p.id !== conn.peer);
      net.conns.delete(conn.peer);
      broadcastPlayers();
      renderHostLobby(container, ctx);
    });
  });
}

function broadcastPlayers() {
  const msg = { type: 'players', players: net.players };
  net.conns.forEach(c => { if (c.open) try { c.send(msg); } catch { /* ignore */ } });
}

function renderHostLobby(container, ctx) {
  const panel = panelEl('🏠 방 코드', '이 코드를 친구에게 알려주세요');
  const codeBox = document.createElement('div'); codeBox.className = 'online-code'; codeBox.textContent = net.code;
  panel.append(codeBox, playerListEl(net.players));
  const actions = document.createElement('div'); actions.className = 'game-actions';
  const spinBtn = mkBtn('뽑기 🎯', 'jelly-btn', () => hostPick(ctx));
  actions.append(spinBtn, mkBtn('나가기', 'jelly-btn secondary', () => renderMenu(container, ctx)));
  panel.appendChild(actions);
  container.innerHTML = ''; container.appendChild(panel);
}

function hostPick(ctx) {
  if (!net || net.players.length < 1) return;
  const idx = Math.floor(Math.random() * net.players.length);
  const w = net.players[idx];
  const msg = { type: 'result', name: w.name, color: w.color };
  net.conns.forEach(c => { if (c.open) try { c.send(msg); } catch { /* ignore */ } });
  showPick(ctx, w);
}

// ── 참가자(게스트) ──
function renderGuestForm(container, ctx) {
  teardown();
  const panel = panelEl('🔑 참가하기', '방 코드와 이름을 입력하세요');
  const form = document.createElement('div'); form.className = 'online-form';
  const codeIn = document.createElement('input'); codeIn.className = 'online-input'; codeIn.placeholder = '방 코드 (예: ABCD)'; codeIn.maxLength = 4; codeIn.style.textTransform = 'uppercase';
  const nameIn = document.createElement('input'); nameIn.className = 'online-input'; nameIn.placeholder = '내 이름'; nameIn.maxLength = 12;
  form.append(codeIn, nameIn);
  const actions = document.createElement('div'); actions.className = 'game-actions';
  actions.append(
    mkBtn('입장 🚪', 'jelly-btn', () => {
      const code = codeIn.value.trim().toUpperCase();
      const name = nameIn.value.trim() || '참가자';
      if (code.length === 4) becomeGuest(container, ctx, code, name);
    }),
    mkBtn('뒤로', 'jelly-btn secondary', () => renderMenu(container, ctx)),
  );
  panel.append(form, actions);
  container.innerHTML = ''; container.appendChild(panel);
}

async function becomeGuest(container, ctx, code, name) {
  const panel = panelEl('🔑 접속 중…', `방 ${esc(code)}`);
  container.innerHTML = ''; container.appendChild(panel);
  let Peer;
  try { Peer = await loadPeer(); } catch { return showError(container, ctx, 'PeerJS 로드 실패 (인터넷 확인)'); }
  if (cancelled) return;
  const peer = new Peer();
  net = { peer, isHost: false, code, conn: null };
  peer.on('open', () => {
    const conn = peer.connect(PEER_PREFIX + code, { reliable: true });
    net.conn = conn;
    const failTimer = setTimeout(() => { if (!cancelled && (!conn.open)) showError(container, ctx, '연결 실패 — 코드를 확인하세요'); }, 8000);
    conn.on('open', () => { clearTimeout(failTimer); conn.send({ type: 'join', name }); renderGuestLobby(container, ctx, []); });
    conn.on('data', (d) => {
      if (cancelled || !d) return;
      if (d.type === 'players') renderGuestLobby(container, ctx, d.players);
      else if (d.type === 'result') showPick(ctx, d);
    });
    conn.on('close', () => { if (!cancelled) showError(container, ctx, '방과의 연결이 끊겼습니다'); });
  });
  peer.on('error', (e) => { if (!cancelled) showError(container, ctx, '연결 오류: ' + (e && e.type ? e.type : e)); });
}

function renderGuestLobby(container, ctx, players) {
  const panel = panelEl('🔑 대기실', '방장이 뽑기를 누르면 결과가 떠요');
  panel.append(playerListEl(players));
  const actions = document.createElement('div'); actions.className = 'game-actions';
  actions.append(mkBtn('나가기', 'jelly-btn secondary', () => renderMenu(container, ctx)));
  panel.appendChild(actions);
  container.innerHTML = ''; container.appendChild(panel);
}

// ── 공용 ──
function playerListEl(players) {
  const wrap = document.createElement('div'); wrap.className = 'online-players';
  const title = document.createElement('div'); title.className = 'online-players-title'; title.textContent = `접속: ${players.length}명`;
  wrap.appendChild(title);
  players.forEach(p => {
    const chip = document.createElement('span'); chip.className = 'online-chip';
    chip.style.background = p.color; chip.textContent = p.name;
    wrap.appendChild(chip);
  });
  return wrap;
}

function showPick(ctx, w) {
  ctx.mascot.setState('celebrate');
  const body = document.createElement('div');
  body.style.fontSize = '24px';
  const b = document.createElement('b'); b.style.color = w.color; b.textContent = w.name;
  body.append(document.createTextNode('🎯 '), b, document.createTextNode(' 당첨!'));
  ctx.showResult({
    title: '온라인 뽑기 🌐',
    bodyEl: body,
    actions: [{ label: '확인', onClick: () => { ctx.hideResult(); ctx.mascot.setState('idle'); } }],
  });
}

function showError(container, ctx, msg) {
  teardown();
  const panel = panelEl('⚠️ 오류', esc(msg));
  const actions = document.createElement('div'); actions.className = 'game-actions';
  actions.append(
    mkBtn('다시', 'jelly-btn', () => renderMenu(container, ctx)),
    mkBtn('홈', 'jelly-btn secondary', () => ctx.navigate('#/')),
  );
  panel.appendChild(actions);
  container.innerHTML = ''; container.appendChild(panel);
}
