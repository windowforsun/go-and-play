import { createStore, loadPersisted, savePersisted } from './core/store.js';
import { initTheme } from './core/theme.js';
import { createRouter } from './core/router.js';
import { createHeader } from './ui/header.js';
import { createParticipantEditor, canStart } from './ui/participant-editor.js';
import { createResultModal } from './ui/result-modal.js';
import { createSound } from './core/sound.js';
import { createShare } from './core/share.js';
import { makeRng, shuffle, pick } from './core/random.js';
import { GAME_LIST, findGame } from './games/registry.js';

const app = document.getElementById('app');

// 상태
const persisted = loadPersisted(localStorage);
const store = createStore({ ...persisted });
const toggleTheme = initTheme(store, localStorage);
const sound = createSound(store.get().settings.sound);
const share = createShare();
const modal = createResultModal();

// 셸
const header = createHeader({ onToggleTheme: toggleTheme });
const viewEl = document.createElement('div');
viewEl.className = 'view';
app.append(header.el, viewEl, modal.el);

// 라우팅되는 게임 정리용
let activeGame = null;
function clearView() {
  if (activeGame && activeGame.unmount) { try { activeGame.unmount(); } catch {} }
  activeGame = null;
  viewEl.innerHTML = '';
  modal.hide();
}

// ctx 팩토리
function makeCtx() {
  return {
    participants: store.get().participants,
    resultItems: [],
    navigate: (hash) => { window.location.hash = hash; },
    showResult: (opts) => modal.show(opts),
    hideResult: () => modal.hide(),
    share: (payload) => share.share(payload),
    mascot: header.mascot,
    sound,
    theme: store.get().settings.theme,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    random: { rng: makeRng((Date.now() & 0xffffffff) >>> 0), shuffle, pick },
  };
}

// 허브 화면
function renderHome() {
  clearView();
  header.mascot.setState('idle');

  const editor = createParticipantEditor({
    initial: store.get().participants,
    onChange: (list) => { store.set({ participants: list }); savePersisted(store.get(), localStorage); },
  });

  const grid = document.createElement('div');
  grid.className = 'game-grid';
  GAME_LIST.forEach(g => {
    const card = document.createElement('div');
    card.className = 'game-card card' + (g.load ? '' : ' locked');
    card.innerHTML = `<span class="gc-icon">${g.icon}</span><span class="gc-name">${g.name}</span>` +
      (g.load ? '' : '<span class="gc-soon">준비 중</span>');
    if (g.load) card.addEventListener('click', () => {
      if (!canStart(store.get().participants)) { alert('참가자를 2명 이상 입력하세요.'); return; }
      window.location.hash = `#/game/${g.id}`;
    });
    grid.appendChild(card);
  });

  viewEl.append(editor.el, grid);
}

// 게임 화면
async function renderGame(id) {
  const meta = findGame(id);
  if (!meta || !meta.load) { window.location.hash = '#/'; return; }
  clearView();
  const expectedHash = `#/game/${id}`;
  const mod = await meta.load();
  if (window.location.hash !== expectedHash) return; // 로딩 중 다른 곳으로 이동했으면 무시
  activeGame = mod.default;
  activeGame.mount(viewEl, makeCtx());
}

// 라우터
const router = createRouter(({ route, param }) => {
  if (route === 'game' && param) renderGame(param);
  else renderHome();
});
router.start();
