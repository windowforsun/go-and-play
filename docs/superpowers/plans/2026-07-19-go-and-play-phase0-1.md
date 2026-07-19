# 고 앤 플레이 — Phase 0(프레임워크) + Phase 1(사다리 타기) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 허브 셸(테마 토글·마스코트·참가자 편집·게임 그리드)과 첫 게임 "사다리 타기"를 완성해, 브라우저에서 실제로 플레이 가능한 첫 버전을 만든다.

**Architecture:** 빌드 없는 순수 ES 모듈 SPA. `index.html` 앱 셸 위에서 해시 라우터가 뷰를 전환하고, 게임은 동일 규격 모듈로 동적 import된다. 순수 로직(`*.logic.js`)은 DOM과 분리해 `node:test`로 검증하고, UI는 로컬 정적 서버로 수동 확인한다.

**Tech Stack:** HTML/CSS/JavaScript (ES 모듈), `node:test`(개발 의존성 0), Google Font `Jua`, SVG/CSS 애니메이션, localStorage. 배포는 GitHub Pages.

## Global Constraints

- 빌드 단계 없음. 번들러·트랜스파일러 금지. 브라우저가 소스를 그대로 실행.
- 모든 앱 코드는 ES 모듈(`import`/`export`). 루트 `package.json`에 `"type": "module"` 필수(테스트가 `.js`를 ESM으로 로드).
- 개발 실행은 로컬 정적 서버(`python3 -m http.server 8000`). `file://` 직접 열기 금지(모듈 CORS 차단).
- 순수 로직 파일 이름은 `*.logic.js`이며 DOM/브라우저 전역(`window`,`document`,`localStorage`)을 참조하지 않는다.
- 게임 모듈은 오직 주입된 `ctx`에만 의존한다(전역 접근 금지).
- 색·폰트·마스코트는 스펙 §4 컨셉(C-다크, 기본 다크, 폰트 `Jua`, 마스코트 "말랑이") 고정.
- `prefers-reduced-motion` 존중(애니메이션 생략, 결과 즉시 표시).
- `brainstorm/`는 정식 코드에서 import 금지(참조/아카이브 전용).
- 커밋 메시지 마지막 줄: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## 파일 구조 (이 플랜이 생성/수정)

```
go-and-play/
├── package.json                 # {"type":"module","scripts":{"test":"node --test"}}
├── index.html                   # 앱 셸(모듈 진입, 폰트, 루트 컨테이너)
├── styles/
│   ├── tokens.css               # 디자인 토큰(라이트/다크 CSS 변수)
│   └── app.css                  # 레이아웃 + 공통 컴포넌트(.jelly-btn/.card/header/modal)
├── src/
│   ├── main.js                  # 부트스트랩: store·theme·router·header·hub 배선, ctx 생성
│   ├── core/
│   │   ├── random.js            # (순수) makeRng/shuffle/pick/randomInt
│   │   ├── store.js             # createStore + load/savePersisted(주입형 storage)
│   │   ├── theme.js             # toggleTheme(순수)/applyTheme/initTheme
│   │   ├── router.js            # parseHash(순수)/createRouter
│   │   ├── sound.js             # 사운드 훅(스텁 — 실제 효과음은 Phase 2+)
│   │   └── share.js             # 공유 훅(스텁 — Phase 2에서 활성화)
│   ├── ui/
│   │   ├── header.js            # 로고 + 테마 토글 + 마스코트 슬롯
│   │   ├── participant-editor.js# 참가자 추가/삭제/편집 (+ 순수 헬퍼)
│   │   └── result-modal.js      # 표준 결과 모달
│   ├── mascot/
│   │   └── mallang.js           # 말랑이 SVG + 상태(idle/thinking/celebrate)
│   └── games/
│       ├── registry.js          # 게임 메타 + 동적 import 로더
│       └── ladder/
│           ├── index.js         # 게임 모듈(규격 구현, DOM)
│           ├── ladder.logic.js  # (순수) 사다리 생성/경로/배정
│           └── ladder.css       # 사다리 화면 스타일
└── tests/
    ├── random.test.js
    ├── store.test.js
    ├── theme.test.js
    ├── router.test.js
    ├── participant.test.js
    └── ladder.logic.test.js
```

**설계 메모(YAGNI):** 스펙 §9의 `ui/jelly-button.js`는 별도 JS 컴포넌트 대신 `app.css`의 `.jelly-btn` 클래스로 구현한다(상태 로직이 없어 모듈화 불필요). `sound.js`/`share.js`는 Phase 0에서 인터페이스 스텁만 둔다.

---

## Phase 0 — 프레임워크

### Task 1: 프로젝트 스캐폴드 (셸 + 토큰 + 테스트 러너)

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `styles/tokens.css`
- Create: `styles/app.css`
- Create: `tests/.gitkeep`

**Interfaces:**
- Produces: 루트 컨테이너 `<div id="app">`, 모듈 진입 `src/main.js`(다음 태스크에서 채움). CSS 변수 토큰(`--ink`,`--bg1`,`--card`,`--pink2`,`--radius-card`,`--dur-fast` 등)과 `[data-theme="light"]` 오버라이드.

- [ ] **Step 1: `package.json` 작성**

```json
{
  "name": "go-and-play",
  "version": "0.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node --test",
    "serve": "python3 -m http.server 8000"
  }
}
```

- [ ] **Step 2: `styles/tokens.css` 작성**

```css
:root {
  --font: 'Jua', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --radius-card: 24px;
  --radius-pill: 999px;
  --dur-fast: .16s;
  --dur-med: .3s;
  /* dark (기본값) */
  --bg1:#160f2e; --bg2:#0e0a20; --card:#241a44; --card2:#2c2050;
  --ink:#efe9ff; --dim:#a99fd0;
  --pink:#ff6fae; --pink2:#ff3d84; --purple:#a06bff;
  --mint:#4fe0d0; --yellow:#ffd45c; --blue:#6db8ff;
  --shadow-card: 0 10px 24px rgba(0,0,0,.35);
  --rung-track:#3a2c60;
}
[data-theme="light"] {
  --bg1:#fbe9ff; --bg2:#e5fff6; --card:#ffffff; --card2:#ffffff;
  --ink:#5a4a6a; --dim:#8a7d9a;
  --shadow-card: 0 8px 20px rgba(150,130,200,.18);
  --rung-track:#e3d9f5;
}
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 3: `styles/app.css` 작성**

```css
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--font); color: var(--ink); min-height: 100vh;
  padding: 20px 16px 60px;
  background: radial-gradient(120% 80% at 50% -10%, #241847 0%, var(--bg1) 45%, var(--bg2) 100%);
}
[data-theme="light"] body {
  background: linear-gradient(160deg, #fbe9ff 0%, #e9f3ff 45%, #e5fff6 100%);
}
.wrap { max-width: 520px; margin: 0 auto; }
.jelly-btn {
  font-family: inherit; font-size: 18px; color: #fff; border: none; cursor: pointer;
  padding: 14px 20px; border-radius: var(--radius-pill);
  background: linear-gradient(135deg, var(--pink2), var(--purple));
  box-shadow: 0 8px 18px rgba(255,61,132,.4);
  transition: transform var(--dur-fast) cubic-bezier(.34,1.56,.64,1);
}
.jelly-btn:hover { transform: translateY(-3px); }
.jelly-btn:active { transform: translateY(2px) scale(.98); }
.jelly-btn.secondary { background: var(--card2); color: var(--ink); box-shadow: var(--shadow-card); }
.card {
  background: linear-gradient(160deg, var(--card2), var(--card));
  border: 1px solid rgba(255,255,255,.06); border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
}
.hidden { display: none !important; }
```

- [ ] **Step 4: `index.html` 작성**

```html
<!DOCTYPE html>
<html lang="ko" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>고 앤 플레이</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Jua&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="./styles/tokens.css">
  <link rel="stylesheet" href="./styles/app.css">
</head>
<body>
  <div id="app" class="wrap"></div>
  <script type="module" src="./src/main.js"></script>
</body>
</html>
```

- [ ] **Step 5: `src/main.js` 임시 스텁 + `tests/.gitkeep`**

`src/main.js`:
```js
document.getElementById('app').textContent = '고 앤 플레이 — 준비 중';
```
빈 파일 `tests/.gitkeep` 생성.

- [ ] **Step 6: 로컬 서버로 수동 확인**

Run: `python3 -m http.server 8000` 후 브라우저에서 `http://localhost:8000`
Expected: 다크 배경에 "고 앤 플레이 — 준비 중" 텍스트 표시, 콘솔 에러 없음.

- [ ] **Step 7: 테스트 러너 동작 확인**

Run: `node --test`
Expected: 테스트 0개라도 오류 없이 종료(exit 0).

- [ ] **Step 8: 커밋**

```bash
git add package.json index.html styles tests src/main.js
git commit -m "$(printf 'feat: scaffold app shell, design tokens, test runner\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 2: `core/random.js` — 순수 난수/셔플 (TDD)

**Files:**
- Create: `src/core/random.js`
- Test: `tests/random.test.js`

**Interfaces:**
- Produces:
  - `makeRng(seed: number) => () => number` — [0,1) 결정적 난수 생성기(mulberry32)
  - `shuffle(array: T[], rng?: () => number) => T[]` — Fisher-Yates, 원본 불변, 새 배열 반환
  - `pick(array: T[], rng?: () => number) => T`
  - `randomInt(min: number, max: number, rng?: () => number) => number` — 양끝 포함

- [ ] **Step 1: 실패 테스트 작성** — `tests/random.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeRng, shuffle, pick, randomInt } from '../src/core/random.js';

test('makeRng is deterministic for the same seed', () => {
  const a = makeRng(42), b = makeRng(42);
  const seqA = [a(), a(), a()], seqB = [b(), b(), b()];
  assert.deepEqual(seqA, seqB);
  seqA.forEach(n => { assert.ok(n >= 0 && n < 1); });
});

test('different seeds diverge', () => {
  const a = makeRng(1), b = makeRng(2);
  assert.notEqual(a(), b());
});

test('shuffle returns a permutation without mutating input', () => {
  const input = [1, 2, 3, 4, 5];
  const out = shuffle(input, makeRng(7));
  assert.deepEqual(input, [1, 2, 3, 4, 5]);            // 불변
  assert.deepEqual([...out].sort((x, y) => x - y), input); // 같은 원소 집합
  assert.equal(out.length, 5);
});

test('randomInt stays within inclusive bounds', () => {
  const rng = makeRng(99);
  for (let i = 0; i < 200; i++) {
    const n = randomInt(3, 6, rng);
    assert.ok(n >= 3 && n <= 6, `out of range: ${n}`);
  }
});

test('pick returns an element of the array', () => {
  const arr = ['a', 'b', 'c'];
  assert.ok(arr.includes(pick(arr, makeRng(5))));
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/random.test.js`
Expected: FAIL — `Cannot find module '../src/core/random.js'`.

- [ ] **Step 3: 최소 구현** — `src/core/random.js`

```js
// 순수 난수 유틸. DOM/전역 미참조.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(array, rng = Math.random) {
  const a = array.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function randomInt(min, max, rng = Math.random) {
  return min + Math.floor(rng() * (max - min + 1));
}

export function pick(array, rng = Math.random) {
  return array[Math.floor(rng() * array.length)];
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/random.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/core/random.js tests/random.test.js
git commit -m "$(printf 'feat: seedable random/shuffle utilities with tests\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 3: `core/store.js` — 상태 + localStorage 지속 (TDD)

**Files:**
- Create: `src/core/store.js`
- Test: `tests/store.test.js`

**Interfaces:**
- Produces:
  - `createStore(initial: object) => { get(): object, set(patch: object): void, subscribe(fn: (state)=>void): () => void }`
  - `defaultState() => { participants: [], settings: { theme: 'dark', sound: true } }`
  - `loadPersisted(storage) => object` — storage(localStorage 형태: `getItem`/`setItem`)에서 복원, 없거나 손상 시 `defaultState()`
  - `savePersisted(state: object, storage) => void` — `participants`,`settings`만 직렬화 저장
  - 상수 `STORAGE_KEY = 'go-and-play'`

- [ ] **Step 1: 실패 테스트 작성** — `tests/store.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore, defaultState, loadPersisted, savePersisted, STORAGE_KEY } from '../src/core/store.js';

function fakeStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), _map: m };
}

test('createStore set merges and notifies subscribers', () => {
  const s = createStore({ a: 1, b: 2 });
  let seen = null;
  const unsub = s.subscribe(state => { seen = state; });
  s.set({ b: 9 });
  assert.deepEqual(s.get(), { a: 1, b: 9 });
  assert.deepEqual(seen, { a: 1, b: 9 });
  unsub();
  s.set({ a: 5 });
  assert.deepEqual(seen, { a: 1, b: 9 }); // 구독 해제 후 미통지
});

test('loadPersisted returns defaults when empty', () => {
  assert.deepEqual(loadPersisted(fakeStorage()), defaultState());
});

test('loadPersisted returns defaults on corrupt JSON', () => {
  assert.deepEqual(loadPersisted(fakeStorage({ [STORAGE_KEY]: '{not json' })), defaultState());
});

test('savePersisted then loadPersisted round-trips participants + settings', () => {
  const st = fakeStorage();
  const state = {
    participants: [{ id: 'p0', name: '민수', color: '#fff' }],
    settings: { theme: 'light', sound: false },
    ephemeral: 'should not persist',
  };
  savePersisted(state, st);
  const loaded = loadPersisted(st);
  assert.deepEqual(loaded.participants, state.participants);
  assert.deepEqual(loaded.settings, state.settings);
  assert.equal(loaded.ephemeral, undefined);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/store.test.js`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현** — `src/core/store.js`

```js
export const STORAGE_KEY = 'go-and-play';

export function defaultState() {
  return { participants: [], settings: { theme: 'dark', sound: true } };
}

export function createStore(initial) {
  let state = initial;
  const subs = new Set();
  return {
    get: () => state,
    set: (patch) => { state = { ...state, ...patch }; subs.forEach(fn => fn(state)); },
    subscribe: (fn) => { subs.add(fn); return () => subs.delete(fn); },
  };
}

export function loadPersisted(storage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const def = defaultState();
    return {
      participants: Array.isArray(parsed.participants) ? parsed.participants : def.participants,
      settings: { ...def.settings, ...(parsed.settings || {}) },
    };
  } catch {
    return defaultState();
  }
}

export function savePersisted(state, storage) {
  const payload = { participants: state.participants, settings: state.settings };
  storage.setItem(STORAGE_KEY, JSON.stringify(payload));
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/store.test.js`
Expected: PASS (4 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/core/store.js tests/store.test.js
git commit -m "$(printf 'feat: observable store with localStorage persistence\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 4: `core/theme.js` — 라이트/다크 토글 (TDD + 수동)

**Files:**
- Create: `src/core/theme.js`
- Test: `tests/theme.test.js`

**Interfaces:**
- Consumes: `createStore`/`savePersisted`(Task 3) — `initTheme`는 store를 받아 초기 테마 적용·구독.
- Produces:
  - `toggleTheme(current: 'dark'|'light') => 'light'|'dark'` (순수)
  - `applyTheme(theme, root = document.documentElement) => void` — `root.setAttribute('data-theme', theme)`
  - `initTheme(store, storage, root?) => void` — store.settings.theme 적용, 토글 시 store 갱신 + savePersisted

- [ ] **Step 1: 실패 테스트 작성** — `tests/theme.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toggleTheme, applyTheme } from '../src/core/theme.js';

test('toggleTheme flips value', () => {
  assert.equal(toggleTheme('dark'), 'light');
  assert.equal(toggleTheme('light'), 'dark');
});

test('applyTheme sets data-theme on a fake root', () => {
  const root = { setAttribute(k, v) { this[k] = v; } };
  applyTheme('light', root);
  assert.equal(root['data-theme'], 'light');
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/theme.test.js`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현** — `src/core/theme.js`

```js
import { savePersisted } from './store.js';

export function toggleTheme(current) {
  return current === 'dark' ? 'light' : 'dark';
}

export function applyTheme(theme, root = document.documentElement) {
  root.setAttribute('data-theme', theme);
}

// 브라우저 전용 배선. store: createStore 결과, storage: localStorage.
export function initTheme(store, storage, root = document.documentElement) {
  applyTheme(store.get().settings.theme, root);
  return function toggle() {
    const next = toggleTheme(store.get().settings.theme);
    store.set({ settings: { ...store.get().settings, theme: next } });
    applyTheme(next, root);
    savePersisted(store.get(), storage);
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/theme.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/core/theme.js tests/theme.test.js
git commit -m "$(printf 'feat: theme toggle (pure + DOM binding)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 5: `core/router.js` — 해시 라우터 (TDD + 수동)

**Files:**
- Create: `src/core/router.js`
- Test: `tests/router.test.js`

**Interfaces:**
- Produces:
  - `parseHash(hash: string) => { route: string, param: string|null }` (순수) — `''`/`'#/'` → `{route:'home',param:null}`; `'#/game/ladder'` → `{route:'game',param:'ladder'}`; `'#/game'` → `{route:'game',param:null}`
  - `createRouter(onChange: (parsed)=>void) => { start(): void, go(hash: string): void }` — `hashchange` 구독, 최초 1회 즉시 호출

- [ ] **Step 1: 실패 테스트 작성** — `tests/router.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseHash } from '../src/core/router.js';

test('empty or root hash → home', () => {
  assert.deepEqual(parseHash(''), { route: 'home', param: null });
  assert.deepEqual(parseHash('#/'), { route: 'home', param: null });
  assert.deepEqual(parseHash('#'), { route: 'home', param: null });
});

test('game route with param', () => {
  assert.deepEqual(parseHash('#/game/ladder'), { route: 'game', param: 'ladder' });
});

test('game route without param', () => {
  assert.deepEqual(parseHash('#/game'), { route: 'game', param: null });
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/router.test.js`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현** — `src/core/router.js`

```js
export function parseHash(hash) {
  const clean = (hash || '').replace(/^#/, '').replace(/^\//, ''); // "game/ladder"
  if (clean === '') return { route: 'home', param: null };
  const [route, param] = clean.split('/');
  return { route, param: param || null };
}

// 브라우저 전용.
export function createRouter(onChange) {
  const handle = () => onChange(parseHash(window.location.hash));
  return {
    start() { window.addEventListener('hashchange', handle); handle(); },
    go(hash) { window.location.hash = hash; },
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/router.test.js`
Expected: PASS (3 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/core/router.js tests/router.test.js
git commit -m "$(printf 'feat: hash router (pure parse + DOM binding)\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 6: `mascot/mallang.js` — 마스코트 SVG + 상태 (수동)

**Files:**
- Create: `src/mascot/mallang.js`
- Modify: `styles/app.css` (마스코트 애니메이션 클래스 추가)

**Interfaces:**
- Produces:
  - `createMascot() => { el: HTMLElement, setState(state: 'idle'|'thinking'|'celebrate'): void }` — `el`은 말랑이 SVG를 담은 요소, `setState`는 CSS 클래스 전환

- [ ] **Step 1: `styles/app.css`에 마스코트 스타일 추가**

```css
.mascot { width: 120px; height: 120px; overflow: visible; transform-origin: 50% 100%;
  filter: drop-shadow(0 10px 22px rgba(255,61,132,.5)); }
.mascot.idle { animation: mallang-float 3.2s ease-in-out infinite, mallang-wobble 2.6s ease-in-out infinite; }
.mascot.thinking { animation: mallang-wobble .6s ease-in-out infinite; }
.mascot.celebrate { animation: mallang-jump .5s ease-in-out infinite; }
@keyframes mallang-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
@keyframes mallang-wobble { 0%,100%{transform:scale(1,1)} 20%{transform:scale(1.06,.94)} 45%{transform:scale(.96,1.05)} 70%{transform:scale(1.03,.97)} }
@keyframes mallang-jump { 0%,100%{transform:translateY(0) scale(1,1)} 40%{transform:translateY(-18px) scale(.95,1.08)} 60%{transform:translateY(0) scale(1.08,.92)} }
```

- [ ] **Step 2: `src/mascot/mallang.js` 작성**

```js
const SVG = `
<svg viewBox="0 0 120 120" class="mascot-svg" style="width:100%;height:100%;overflow:visible">
  <defs>
    <linearGradient id="mallang-body" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ff8ec4"/><stop offset=".55" stop-color="#ff5c9e"/><stop offset="1" stop-color="#a06bff"/>
    </linearGradient>
    <radialGradient id="mallang-gloss" cx="35%" cy="30%" r="60%">
      <stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <path d="M60 16 C32 16 17 42 17 68 C17 97 37 110 60 110 C83 110 103 97 103 68 C103 42 88 16 60 16 Z" fill="url(#mallang-body)"/>
  <ellipse cx="46" cy="44" rx="20" ry="15" fill="url(#mallang-gloss)" transform="rotate(-18 46 44)"/>
  <ellipse cx="34" cy="80" rx="8" ry="5" fill="#ff3d84" opacity=".45"/>
  <ellipse cx="86" cy="80" rx="8" ry="5" fill="#ff3d84" opacity=".45"/>
  <ellipse cx="47" cy="64" rx="6.5" ry="9" fill="#2a1638">
    <animate attributeName="ry" values="9;9;1;9;9" keyTimes="0;.45;.5;.55;1" dur="4s" repeatCount="indefinite"/>
  </ellipse>
  <ellipse cx="73" cy="64" rx="6.5" ry="9" fill="#2a1638">
    <animate attributeName="ry" values="9;9;1;9;9" keyTimes="0;.45;.5;.55;1" dur="4s" repeatCount="indefinite"/>
  </ellipse>
  <circle cx="49" cy="61" r="2" fill="#fff"/><circle cx="75" cy="61" r="2" fill="#fff"/>
  <path d="M52 80 Q60 89 68 80" stroke="#2a1638" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>`;

export function createMascot() {
  const el = document.createElement('div');
  el.className = 'mascot idle';
  el.innerHTML = SVG;
  return {
    el,
    setState(state) { el.className = `mascot ${state}`; },
  };
}
```

- [ ] **Step 3: 임시 확인 배선** — `src/main.js`를 잠시 교체

```js
import { createMascot } from './mascot/mallang.js';
const app = document.getElementById('app');
const m = createMascot();
app.appendChild(m.el);
```

- [ ] **Step 4: 수동 확인**

Run: `python3 -m http.server 8000` → `http://localhost:8000`
Expected: 말랑이 젤리 캐릭터가 위아래로 떠다니며(float) 말랑말랑 흔들리고(wobble) 눈을 깜빡인다. 콘솔 에러 없음.

- [ ] **Step 5: 커밋**

```bash
git add src/mascot/mallang.js styles/app.css src/main.js
git commit -m "$(printf 'feat: mallang mascot with idle/thinking/celebrate states\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 7: `ui/header.js` — 헤더 (로고 + 테마 토글 + 마스코트 슬롯) (수동)

**Files:**
- Create: `src/ui/header.js`
- Modify: `styles/app.css` (헤더 스타일)

**Interfaces:**
- Consumes: `createMascot`(Task 6).
- Produces:
  - `createHeader({ onToggleTheme: () => void }) => { el: HTMLElement, mascot: {el,setState} }` — 로고 "GO & PLAY", 테마 토글 버튼(🌙/☀️), 마스코트 포함

- [ ] **Step 1: `styles/app.css`에 헤더 스타일 추가**

```css
.app-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.app-header .logo { font-size: 26px;
  background: linear-gradient(135deg,#ff6fae,#a06bff 55%,#4fe0d0);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.theme-toggle { background: var(--card2); color: var(--ink); border: none; cursor: pointer;
  width: 40px; height: 40px; border-radius: 50%; font-size: 18px; box-shadow: var(--shadow-card); }
.hero { text-align: center; margin-bottom: 18px; }
```

- [ ] **Step 2: `src/ui/header.js` 작성**

```js
import { createMascot } from '../mascot/mallang.js';

export function createHeader({ onToggleTheme }) {
  const el = document.createElement('div');

  const bar = document.createElement('div');
  bar.className = 'app-header';
  const logo = document.createElement('div');
  logo.className = 'logo';
  logo.textContent = 'GO & PLAY';
  const toggle = document.createElement('button');
  toggle.className = 'theme-toggle';
  toggle.textContent = '🌙';
  toggle.setAttribute('aria-label', '테마 전환');
  toggle.addEventListener('click', () => {
    onToggleTheme();
    toggle.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '🌙' : '☀️';
  });
  bar.append(logo, toggle);

  const hero = document.createElement('div');
  hero.className = 'hero';
  const mascot = createMascot();
  hero.appendChild(mascot.el);

  el.append(bar, hero);
  return { el, mascot };
}
```

- [ ] **Step 3: 수동 확인 배선** — `src/main.js` 임시 교체

```js
import { createHeader } from './ui/header.js';
const app = document.getElementById('app');
const header = createHeader({ onToggleTheme: () => {
  const cur = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
}});
app.appendChild(header.el);
```

- [ ] **Step 4: 수동 확인**

Run: `http://localhost:8000`
Expected: 상단에 "GO & PLAY" 로고 + 우측 🌙 버튼, 아래 말랑이. 🌙 클릭 시 배경이 라이트로 바뀌고 아이콘이 ☀️로 토글.

- [ ] **Step 5: 커밋**

```bash
git add src/ui/header.js styles/app.css src/main.js
git commit -m "$(printf 'feat: header with logo, theme toggle, mascot\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 8: `ui/participant-editor.js` — 참가자 편집 (TDD 헬퍼 + 수동 UI)

**Files:**
- Create: `src/ui/participant-editor.js`
- Test: `tests/participant.test.js`
- Modify: `styles/app.css`

**Interfaces:**
- Consumes: 없음(순수 헬퍼 자체 포함).
- Produces:
  - `PALETTE: string[]`
  - `participantColor(index: number) => string`
  - `normalizeName(raw: string) => string` (trim)
  - `makeParticipant(name: string, index: number) => { id, name, color }` — `id = 'p' + index`
  - `canStart(participants: any[]) => boolean` — 길이 ≥ 2
  - `createParticipantEditor({ initial: any[], onChange: (list)=>void }) => { el, getParticipants(): any[] }`

- [ ] **Step 1: 실패 테스트 작성** — `tests/participant.test.js`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeName, participantColor, makeParticipant, canStart, PALETTE } from '../src/ui/participant-editor.js';

test('normalizeName trims whitespace', () => {
  assert.equal(normalizeName('  민수  '), '민수');
});

test('participantColor cycles through the palette', () => {
  assert.equal(participantColor(0), PALETTE[0]);
  assert.equal(participantColor(PALETTE.length), PALETTE[0]);
});

test('makeParticipant builds id/name/color', () => {
  const p = makeParticipant('  지현 ', 1);
  assert.equal(p.id, 'p1');
  assert.equal(p.name, '지현');
  assert.equal(p.color, PALETTE[1]);
});

test('canStart requires at least two participants', () => {
  assert.equal(canStart([{}]), false);
  assert.equal(canStart([{}, {}]), true);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/participant.test.js`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현** — `src/ui/participant-editor.js`

```js
export const PALETTE = ['#ff3d84', '#38b6aa', '#ffd45c', '#a06bff', '#6db8ff', '#ff9a76', '#4fe0d0', '#ff6fae'];

export function participantColor(index) { return PALETTE[index % PALETTE.length]; }
export function normalizeName(raw) { return String(raw).trim(); }
export function makeParticipant(name, index) {
  return { id: 'p' + index, name: normalizeName(name), color: participantColor(index) };
}
export function canStart(participants) { return participants.length >= 2; }

export function createParticipantEditor({ initial = [], onChange = () => {} }) {
  let items = initial.length
    ? initial.slice()
    : [makeParticipant('참가자 1', 0), makeParticipant('참가자 2', 1)];

  const el = document.createElement('div');
  el.className = 'participant-editor card';

  function reindex() { items = items.map((p, i) => ({ ...p, id: 'p' + i, color: participantColor(i) })); }
  function emit() { onChange(items); }

  function render() {
    el.innerHTML = '<h3 class="pe-title">참가자</h3>';
    const list = document.createElement('div');
    list.className = 'pe-list';
    items.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'pe-row';
      const dot = document.createElement('span');
      dot.className = 'pe-dot'; dot.style.background = p.color;
      const input = document.createElement('input');
      input.className = 'pe-input'; input.value = p.name;
      input.addEventListener('input', () => { items[i] = { ...items[i], name: normalizeName(input.value) }; emit(); });
      const del = document.createElement('button');
      del.className = 'pe-del'; del.textContent = '✕'; del.setAttribute('aria-label', '삭제');
      del.addEventListener('click', () => { items.splice(i, 1); reindex(); render(); emit(); });
      row.append(dot, input, del);
      list.appendChild(row);
    });
    const add = document.createElement('button');
    add.className = 'jelly-btn secondary pe-add'; add.textContent = '+ 참가자 추가';
    add.addEventListener('click', () => { items.push(makeParticipant('참가자 ' + (items.length + 1), items.length)); render(); emit(); });
    el.append(list, add);
  }

  render();
  emit();
  return { el, getParticipants: () => items };
}
```

- [ ] **Step 4: `styles/app.css`에 편집기 스타일 추가**

```css
.participant-editor { padding: 18px; margin: 14px 0; }
.pe-title { font-size: 18px; margin-bottom: 12px; color: var(--pink); }
.pe-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.pe-dot { width: 16px; height: 16px; border-radius: 50%; flex: 0 0 auto; }
.pe-input { flex: 1; font-family: inherit; font-size: 16px; padding: 8px 12px;
  border-radius: 12px; border: 1px solid rgba(255,255,255,.12); background: var(--bg2); color: var(--ink); }
.pe-del { background: none; border: none; color: var(--dim); cursor: pointer; font-size: 16px; }
.pe-add { width: 100%; margin-top: 8px; }
```

- [ ] **Step 5: 통과 확인 + 수동 확인**

Run: `node --test tests/participant.test.js`
Expected: PASS (4 tests).
그다음 `src/main.js`에 임시로 `createParticipantEditor` 붙여 `http://localhost:8000` 확인 — 참가자 2명 기본 표시, 추가/삭제/이름수정 동작, 삭제 시 색 재배정.

- [ ] **Step 6: 커밋**

```bash
git add src/ui/participant-editor.js tests/participant.test.js styles/app.css src/main.js
git commit -m "$(printf 'feat: participant editor with tested pure helpers\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 9: `ui/result-modal.js` + core 스텁(sound/share) (수동)

**Files:**
- Create: `src/ui/result-modal.js`
- Create: `src/core/sound.js`
- Create: `src/core/share.js`
- Modify: `styles/app.css`

**Interfaces:**
- Produces:
  - `createResultModal() => { show(opts): void, hide(): void, el: HTMLElement }` — `opts = { title, bodyEl?, bodyHtml?, actions: [{label, onClick, kind?}] }`
  - `createSound() => { play(name: string): void, setEnabled(on: boolean): void }` — Phase 0 스텁(no-op, 콘솔 로그 없음)
  - `createShare() => { share(payload: {title,text}): Promise<void> }` — Phase 2 활성화용 스텁; 현재는 `navigator.share` 있으면 호출, 없으면 클립보드 복사 시도

- [ ] **Step 1: `src/core/sound.js` (스텁)**

```js
// Phase 0 스텁: 인터페이스만 고정. 실제 효과음은 Phase 2+.
export function createSound(enabled = true) {
  let on = enabled;
  return { play() { /* no-op until Phase 2 */ }, setEnabled(v) { on = v; }, get enabled() { return on; } };
}
```

- [ ] **Step 2: `src/core/share.js` (Phase 2 활성화용, 지금은 미배선)**

```js
export function createShare() {
  return {
    async share(payload) {
      if (navigator.share) { try { await navigator.share(payload); return; } catch { /* 취소 등 무시 */ } }
      if (navigator.clipboard) { await navigator.clipboard.writeText(`${payload.title}\n${payload.text}`); }
    },
  };
}
```

- [ ] **Step 3: `src/ui/result-modal.js`**

```js
export function createResultModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay hidden';
  const box = document.createElement('div');
  box.className = 'modal-box card';
  overlay.appendChild(box);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) hide(); });

  function hide() { overlay.classList.add('hidden'); box.innerHTML = ''; }
  function show({ title, bodyEl, bodyHtml, actions = [] }) {
    box.innerHTML = '';
    const h = document.createElement('h2');
    h.className = 'modal-title'; h.textContent = title;
    box.appendChild(h);
    const body = document.createElement('div');
    body.className = 'modal-body';
    if (bodyEl) body.appendChild(bodyEl);
    else if (bodyHtml) body.innerHTML = bodyHtml;
    box.appendChild(body);
    const row = document.createElement('div');
    row.className = 'modal-actions';
    actions.forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'jelly-btn' + (a.kind === 'secondary' ? ' secondary' : '');
      btn.textContent = a.label;
      btn.addEventListener('click', () => a.onClick());
      row.appendChild(btn);
    });
    box.appendChild(row);
    overlay.classList.remove('hidden');
  }
  return { el: overlay, show, hide };
}
```

- [ ] **Step 4: `styles/app.css`에 모달 스타일 추가**

```css
.modal-overlay { position: fixed; inset: 0; background: rgba(10,6,24,.6); display: flex;
  align-items: center; justify-content: center; padding: 20px; z-index: 100; }
.modal-box { padding: 24px; max-width: 440px; width: 100%; text-align: center; }
.modal-title { font-size: 22px; margin-bottom: 14px; color: var(--pink); }
.modal-body { margin-bottom: 18px; }
.modal-actions { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
```

- [ ] **Step 5: 수동 확인 배선** — `src/main.js` 임시

```js
import { createResultModal } from './ui/result-modal.js';
const app = document.getElementById('app');
const modal = createResultModal();
app.appendChild(modal.el);
const open = document.createElement('button');
open.className = 'jelly-btn'; open.textContent = '모달 테스트';
open.addEventListener('click', () => modal.show({
  title: '결과!', bodyHtml: '<p>민수 → 당첨 🎉</p>',
  actions: [{ label: '다시하기', onClick: () => modal.hide() }, { label: '홈', kind: 'secondary', onClick: () => modal.hide() }],
}));
app.appendChild(open);
```

- [ ] **Step 6: 수동 확인**

Run: `http://localhost:8000`
Expected: "모달 테스트" 클릭 시 결과 모달 표시, 오버레이 클릭/버튼으로 닫힘.

- [ ] **Step 7: 커밋**

```bash
git add src/ui/result-modal.js src/core/sound.js src/core/share.js styles/app.css src/main.js
git commit -m "$(printf 'feat: result modal + sound/share interface stubs\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 10: `games/registry.js` — 게임 메타 + 동적 로더

**Files:**
- Create: `src/games/registry.js`

**Interfaces:**
- Produces:
  - `GAME_LIST: Array<{ id, name, icon, type, load: () => Promise<{default: GameModule}> }>` — Phase 0-1에서는 `ladder` 1개만 실제 로더 연결. 나머지 카탈로그(스펙 §3)는 `load`가 `null`인 "예정" 항목으로 포함해 그리드에 잠금 표시.
  - `GameModule` 형태(주석): `{ id, name, icon, type, minPlayers, mount(container, ctx), unmount() }`

- [ ] **Step 1: `src/games/registry.js` 작성**

```js
// 게임 카탈로그(스펙 §3). load가 함수면 플레이 가능, null이면 "예정".
export const GAME_LIST = [
  { id: 'ladder', name: '사다리 타기', icon: '🪜', type: 'assign', load: () => import('./ladder/index.js') },
  { id: 'roulette', name: '룰렛', icon: '🎡', type: 'pick-one', load: null },
  { id: 'finger', name: '손가락 짚기', icon: '👆', type: 'pick-one', load: null },
  { id: 'draw', name: '제비뽑기', icon: '🎴', type: 'assign', load: null },
  { id: 'bomb', name: '폭탄 돌리기', icon: '💣', type: 'pick-one', load: null },
  { id: 'dice', name: '주사위', icon: '🎲', type: 'order', load: null },
];

export function findGame(id) { return GAME_LIST.find(g => g.id === id) || null; }
```

- [ ] **Step 2: 확인 (임시 로그)**

`src/main.js`에 임시로 `import { GAME_LIST } from './games/registry.js'; console.log(GAME_LIST.map(g => g.id));` 넣고 `http://localhost:8000` 콘솔에서 `['ladder','roulette',...]` 확인.

- [ ] **Step 3: 커밋**

```bash
git add src/games/registry.js src/main.js
git commit -m "$(printf 'feat: game registry with catalog + dynamic loaders\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 11: `src/main.js` — 부트스트랩 + 허브 뷰 + ctx (수동 통합)

**Files:**
- Rewrite: `src/main.js`
- Modify: `styles/app.css` (게임 그리드)

**Interfaces:**
- Consumes: `createStore`,`defaultState`,`loadPersisted`,`savePersisted`(T3); `initTheme`(T4); `createRouter`(T5); `createHeader`(T7); `createParticipantEditor`,`canStart`(T8); `createResultModal`(T9); `createSound`,`createShare`(T9); `makeRng`,`shuffle`,`pick`(T2); `GAME_LIST`,`findGame`(T10).
- Produces:
  - `ctx` 객체 — 게임 `mount(container, ctx)`에 전달:
    ```
    ctx = { participants, resultItems, navigate(hash), showResult(opts),
            hideResult(), share(payload), mascot, sound, theme, reducedMotion, random }
    ```
    - `participants`: 현재 참가자 배열(허브에서 편집된 값)
    - `resultItems`: 게임이 설정하는 결과 항목(초기 `[]`, 게임이 채움)
    - `navigate('#/')` 등 라우터 이동
    - `showResult(opts)`/`hideResult()`: 결과 모달 제어(opts는 T9 `show` 형식)
    - `reducedMotion`: `prefers-reduced-motion` 여부(게임은 전역 접근 대신 이 값 사용)
    - `random`: `{ rng: makeRng(seed), shuffle, pick }`

- [ ] **Step 1: `styles/app.css`에 게임 그리드 스타일 추가**

```css
.game-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin: 20px 0; }
.game-card { padding: 20px 12px; text-align: center; cursor: pointer;
  transition: transform var(--dur-fast) cubic-bezier(.34,1.56,.64,1); }
.game-card:hover { transform: translateY(-5px); }
.game-card:active { transform: translateY(2px) scale(.97); }
.game-card.locked { opacity: .5; cursor: not-allowed; }
.game-card .gc-icon { font-size: 34px; display: block; margin-bottom: 8px; }
.game-card .gc-name { font-size: 16px; }
.game-card .gc-soon { font-size: 11px; color: var(--dim); display: block; margin-top: 4px; }
.view { margin-top: 8px; }
```

- [ ] **Step 2: `src/main.js` 재작성**

```js
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
  const mod = await meta.load();
  activeGame = mod.default;
  activeGame.mount(viewEl, makeCtx());
}

// 라우터
const router = createRouter(({ route, param }) => {
  if (route === 'game' && param) renderGame(param);
  else renderHome();
});
router.start();
```

- [ ] **Step 3: 수동 통합 확인**

Run: `http://localhost:8000`
Expected:
- 허브: 헤더+말랑이, 참가자 편집기(2명 기본), 게임 그리드 6개(사다리만 활성, 나머지 "준비 중" 흐림).
- 테마 토글 동작 + 새로고침해도 참가자/테마 유지(localStorage).
- 참가자 1명으로 줄이고 사다리 클릭 → "참가자를 2명 이상" 경고.
- 사다리 카드 클릭 → 해시 `#/game/ladder`로 바뀌고 화면 비워짐(아직 게임 미구현이라 빈 뷰). 뒤로가기 → 허브 복귀.

- [ ] **Step 4: 커밋**

```bash
git add src/main.js styles/app.css
git commit -m "$(printf 'feat: bootstrap hub view, routing, ctx factory\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

## Phase 1 — 사다리 타기

### Task 12: `ladder.logic.js` — 사다리 생성 (TDD)

**Files:**
- Create: `src/games/ladder/ladder.logic.js`
- Test: `tests/ladder.logic.test.js`

**Interfaces:**
- Produces:
  - `rungKey(row: number, leftCol: number) => string`
  - `generateLadder(columns: number, rows: number, rng?: () => number) => { columns, rows, rungs: Set<string> }` — 각 행에서 인접 가로줄이 겹치지 않도록 배치(같은 행에서 한 열의 좌우 동시 연결 금지)

- [ ] **Step 1: 실패 테스트 작성** — `tests/ladder.logic.test.js` (생성 부분)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateLadder, rungKey } from '../src/games/ladder/ladder.logic.js';
import { makeRng } from '../src/core/random.js';

test('generateLadder has the requested shape', () => {
  const l = generateLadder(4, 8, makeRng(3));
  assert.equal(l.columns, 4);
  assert.equal(l.rows, 8);
  assert.ok(l.rungs instanceof Set);
});

test('no two adjacent rungs share a row (no ambiguous crossing)', () => {
  const l = generateLadder(5, 12, makeRng(11));
  for (let row = 0; row < l.rows; row++) {
    for (let left = 0; left < l.columns - 2; left++) {
      const both = l.rungs.has(rungKey(row, left)) && l.rungs.has(rungKey(row, left + 1));
      assert.ok(!both, `adjacent rungs at row ${row}, left ${left}`);
    }
  }
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/ladder.logic.test.js`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 최소 구현** — `src/games/ladder/ladder.logic.js`

```js
export function rungKey(row, leftCol) { return `${row},${leftCol}`; }

// columns 세로줄, rows 행. 각 행에서 인접 가로줄이 겹치지 않게 배치.
export function generateLadder(columns, rows, rng = Math.random) {
  const rungs = new Set();
  for (let row = 0; row < rows; row++) {
    for (let left = 0; left < columns - 1; left++) {
      if (rungs.has(rungKey(row, left - 1))) continue; // 왼쪽에 이미 가로줄 → 겹침 방지
      if (rng() < 0.5) rungs.add(rungKey(row, left));
    }
  }
  return { columns, rows, rungs };
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/ladder.logic.test.js`
Expected: PASS (2 tests).

- [ ] **Step 5: 커밋**

```bash
git add src/games/ladder/ladder.logic.js tests/ladder.logic.test.js
git commit -m "$(printf 'feat: ladder generation with no-adjacent-rung invariant\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 13: `ladder.logic.js` — 경로/배정 (TDD)

**Files:**
- Modify: `src/games/ladder/ladder.logic.js`
- Modify: `tests/ladder.logic.test.js`

**Interfaces:**
- Consumes: `generateLadder`,`rungKey`(Task 12).
- Produces:
  - `tracePath(ladder, startCol: number) => number[]` — 각 행을 지날 때의 열 순서(길이 `rows+1`, `[startCol, …, endCol]`). 경로 계산의 **단일 출처**(애니메이션·배정이 공유)
  - `traverse(ladder, startCol: number) => number` — 도착 열(=`tracePath` 마지막 값)
  - `computeAssignments(ladder) => number[]` — `result[startCol] = endCol`, 항상 `0..columns-1`의 순열(전단사)

- [ ] **Step 1: 실패 테스트 추가** — `tests/ladder.logic.test.js`에 append

```js
import { traverse, computeAssignments, tracePath } from '../src/games/ladder/ladder.logic.js';

test('traverse follows a single known rung', () => {
  // 열 3개, 행 1개, (row0,left0) 가로줄만 → 0↔1 스왑, 2는 그대로
  const ladder = { columns: 3, rows: 1, rungs: new Set([rungKey(0, 0)]) };
  assert.equal(traverse(ladder, 0), 1);
  assert.equal(traverse(ladder, 1), 0);
  assert.equal(traverse(ladder, 2), 2);
});

test('tracePath returns rows+1 columns ending at traverse()', () => {
  const l = generateLadder(5, 10, makeRng(7));
  for (let c = 0; c < l.columns; c++) {
    const seq = tracePath(l, c);
    assert.equal(seq.length, l.rows + 1);
    assert.equal(seq[0], c);
    assert.equal(seq[seq.length - 1], traverse(l, c)); // 단일 출처 일치
  }
});

test('computeAssignments is always a bijection (permutation)', () => {
  for (const seed of [1, 2, 3, 42, 100]) {
    const l = generateLadder(6, 15, makeRng(seed));
    const res = computeAssignments(l);
    assert.equal(res.length, 6);
    assert.deepEqual([...res].sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
  }
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --test tests/ladder.logic.test.js`
Expected: FAIL — `traverse`/`computeAssignments` 미정의.

- [ ] **Step 3: 최소 구현** — `src/games/ladder/ladder.logic.js`에 추가

```js
// 경로의 단일 출처: 각 행을 지나며 도달하는 열 순서(길이 rows+1).
export function tracePath(ladder, startCol) {
  const seq = [startCol];
  let col = startCol;
  for (let row = 0; row < ladder.rows; row++) {
    if (ladder.rungs.has(rungKey(row, col - 1))) col -= 1;
    else if (ladder.rungs.has(rungKey(row, col))) col += 1;
    seq.push(col);
  }
  return seq;
}

export function traverse(ladder, startCol) {
  const seq = tracePath(ladder, startCol);
  return seq[seq.length - 1];
}

export function computeAssignments(ladder) {
  const result = [];
  for (let c = 0; c < ladder.columns; c++) result[c] = traverse(ladder, c);
  return result;
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --test tests/ladder.logic.test.js`
Expected: PASS (4 tests 전체).

- [ ] **Step 5: 커밋**

```bash
git add src/games/ladder/ladder.logic.js tests/ladder.logic.test.js
git commit -m "$(printf 'feat: ladder traverse + bijective assignment\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 14: `ladder/index.js` — 게임 모듈 + 설정 화면 (수동)

**Files:**
- Create: `src/games/ladder/index.js`
- Create: `src/games/ladder/ladder.css`
- Modify: `index.html` (ladder.css 링크)

**Interfaces:**
- Consumes: `ctx`(T11); `generateLadder`,`computeAssignments`(T12-13).
- Produces: `default` GameModule — `{ id:'ladder', name, icon, type:'assign', minPlayers:2, mount(container, ctx), unmount() }`. `mount`은 먼저 **설정 화면**(참가자 확인 + 결과 항목 입력)을 렌더, "출발!" 시 Task 15의 플레이 화면 호출.

- [ ] **Step 1: `index.html`에 ladder.css 링크 추가** (`app.css` 링크 아래)

```html
  <link rel="stylesheet" href="./src/games/ladder/ladder.css">
```

- [ ] **Step 2: `src/games/ladder/ladder.css` 작성**

```css
.ladder-setup { padding: 18px; margin-top: 8px; }
.ladder-setup h2 { font-size: 20px; color: var(--pink); margin-bottom: 12px; }
.ladder-results .pe-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
.ladder-results .pe-input { flex: 1; font-family: inherit; font-size: 16px; padding: 8px 12px;
  border-radius: 12px; border: 1px solid rgba(255,255,255,.12); background: var(--bg2); color: var(--ink); }
.ladder-actions { display: flex; gap: 10px; margin-top: 16px; }
.ladder-actions .jelly-btn { flex: 1; }
.ladder-stage { margin-top: 10px; text-align: center; }
.ladder-svg-wrap { position: relative; display: inline-block; margin: 10px auto; }
.ladder-token { position: absolute; width: 16px; height: 16px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff, var(--pink2)); box-shadow: 0 0 12px var(--pink2);
  transition: top .25s linear, left .25s linear; }
.ladder-labels { display: flex; justify-content: space-around; margin-top: 8px; }
.ladder-labels span { font-size: 13px; color: #fff; padding: 3px 10px; border-radius: var(--radius-pill); }
```

- [ ] **Step 3: `src/games/ladder/index.js` — 설정 화면까지**

```js
import { generateLadder, computeAssignments } from './ladder.logic.js';
import { playLadder } from './play.js';

export default {
  id: 'ladder',
  name: '사다리 타기',
  icon: '🪜',
  type: 'assign',
  minPlayers: 2,

  mount(container, ctx) {
    this._container = container;
    this._ctx = ctx;
    renderSetup(container, ctx);
  },

  unmount() {
    if (this._container) this._container.innerHTML = '';
  },
};

function renderSetup(container, ctx) {
  const participants = ctx.participants;
  // 결과 항목 기본값: 참가자 수만큼. 관례상 "꽝" 여러 개 + "당첨" 1개.
  const results = participants.map((_, i) => (i === 0 ? '당첨 🎉' : '꽝'));

  const wrap = document.createElement('div');
  wrap.className = 'ladder-setup card';
  wrap.innerHTML = '<h2>🪜 사다리 타기 — 결과 정하기</h2>';

  const list = document.createElement('div');
  list.className = 'ladder-results';
  results.forEach((r, i) => {
    const row = document.createElement('div');
    row.className = 'pe-row';
    const dot = document.createElement('span');
    dot.className = 'pe-dot'; dot.style.background = participants[i].color;
    const input = document.createElement('input');
    input.className = 'pe-input'; input.value = r;
    input.addEventListener('input', () => { results[i] = input.value; });
    row.append(dot, input);
    list.appendChild(row);
  });
  wrap.appendChild(list);

  const actions = document.createElement('div');
  actions.className = 'ladder-actions';
  const back = document.createElement('button');
  back.className = 'jelly-btn secondary'; back.textContent = '← 홈';
  back.addEventListener('click', () => ctx.navigate('#/'));
  const start = document.createElement('button');
  start.className = 'jelly-btn'; start.textContent = '출발! 🪜';
  start.addEventListener('click', () => {
    const ladder = generateLadder(participants.length, Math.max(8, participants.length * 3), ctx.random.rng);
    const assignments = computeAssignments(ladder);
    playLadder(container, ctx, { participants, results: results.map(r => r.trim() || '꽝'), ladder, assignments });
  });
  actions.append(back, start);
  wrap.appendChild(actions);

  container.innerHTML = '';
  container.appendChild(wrap);
}
```

- [ ] **Step 4: `play.js` 임시 스텁** (Task 15에서 완성) — `src/games/ladder/play.js`

```js
export function playLadder(container, ctx, data) {
  container.innerHTML = '<p style="text-align:center">플레이 화면 준비 중…</p>';
}
```

- [ ] **Step 5: 수동 확인**

Run: `http://localhost:8000` → 참가자 3명 입력 → 사다리 카드 클릭
Expected: "사다리 타기 — 결과 정하기" 설정 화면, 각 참가자 색 점 + 결과 입력(당첨/꽝). "← 홈" 동작. "출발!" 클릭 시 "플레이 화면 준비 중" 표시(스텁).

- [ ] **Step 6: 커밋**

```bash
git add src/games/ladder/index.js src/games/ladder/ladder.css src/games/ladder/play.js index.html
git commit -m "$(printf 'feat: ladder game module + setup screen\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 15: 사다리 렌더링 + 애니메이션 + 결과 (수동)

**Files:**
- Rewrite: `src/games/ladder/play.js`

**Interfaces:**
- Consumes: `ctx`(mascot/showResult/navigate), `data = { participants, results, ladder, assignments }`(T14); `traverse`는 불필요(assignments 사용).
- Produces: `playLadder(container, ctx, data) => void` — 사다리 SVG를 그리고, 각 참가자별 토큰이 경로를 따라 내려가는 애니메이션 후 결과 모달 표시.

- [ ] **Step 1: `src/games/ladder/play.js` 재작성**

```js
import { rungKey, tracePath } from './ladder.logic.js';

const COL_GAP = 70, TOP = 20, ROW_GAP = 22, PAD = 20;

function xOf(col) { return PAD + col * COL_GAP; }
// 행 y좌표: 세로줄 범위(TOP ~ TOP+rows*ROW_GAP) 안쪽에 균등 배치
function yOf(row) { return TOP + (row + 0.5) * ROW_GAP; }

export function playLadder(container, ctx, data) {
  const { participants, results, ladder, assignments } = data;
  const n = participants.length;
  const width = PAD * 2 + (n - 1) * COL_GAP;
  const height = TOP * 2 + ladder.rows * ROW_GAP;

  ctx.mascot.setState('thinking');

  const stage = document.createElement('div');
  stage.className = 'ladder-stage';

  // 상단 참가자 라벨
  const top = document.createElement('div');
  top.className = 'ladder-labels';
  participants.forEach(p => {
    const s = document.createElement('span'); s.textContent = p.name; s.style.background = p.color; top.appendChild(s);
  });

  // SVG
  const wrap = document.createElement('div');
  wrap.className = 'ladder-svg-wrap';
  wrap.style.width = width + 'px'; wrap.style.height = height + 'px';
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('width', width); svg.setAttribute('height', height);

  // 세로줄
  for (let c = 0; c < n; c++) {
    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', xOf(c)); line.setAttribute('x2', xOf(c));
    line.setAttribute('y1', TOP); line.setAttribute('y2', height - TOP);
    line.style.stroke = 'var(--rung-track)'; // CSS 속성으로 설정해야 var()가 해석됨(프레젠테이션 속성 X)
    line.setAttribute('stroke-width', '6');
    line.setAttribute('stroke-linecap', 'round');
    svg.appendChild(line);
  }
  // 가로줄
  for (let row = 0; row < ladder.rows; row++) {
    for (let left = 0; left < n - 1; left++) {
      if (!ladder.rungs.has(rungKey(row, left))) continue;
      const y = yOf(row);
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', xOf(left)); line.setAttribute('x2', xOf(left + 1));
      line.setAttribute('y1', y); line.setAttribute('y2', y);
      line.setAttribute('stroke', participants[left].color); line.setAttribute('stroke-width', '6');
      line.setAttribute('stroke-linecap', 'round');
      svg.appendChild(line);
    }
  }
  wrap.appendChild(svg);

  // 토큰(한 참가자씩 순차 애니메이션)
  const token = document.createElement('div');
  token.className = 'ladder-token';
  wrap.appendChild(token);

  // 하단 결과 라벨
  const bottom = document.createElement('div');
  bottom.className = 'ladder-labels';
  results.forEach(r => { const s = document.createElement('span'); s.textContent = r; s.style.background = 'var(--purple)'; bottom.appendChild(s); });

  const actions = document.createElement('div');
  actions.className = 'ladder-actions';
  const skip = document.createElement('button');
  skip.className = 'jelly-btn secondary'; skip.textContent = '결과 바로 보기';
  actions.appendChild(skip);

  stage.append(top, wrap, bottom, actions);
  container.innerHTML = '';
  container.appendChild(stage);

  // 경로 좌표 계산: 참가자 0부터 순차로 내려가는 애니메이션
  // 경로는 ladder.logic의 tracePath 단일 출처를 사용(assignments와 규칙 공유 → 도착 열 항상 일치)
  function pathPoints(startCol) {
    const seq = tracePath(ladder, startCol);
    const pts = [{ x: xOf(seq[0]), y: TOP }];
    for (let row = 0; row < ladder.rows; row++) {
      const y = yOf(row);
      pts.push({ x: xOf(seq[row]), y });
      if (seq[row + 1] !== seq[row]) pts.push({ x: xOf(seq[row + 1]), y });
    }
    pts.push({ x: xOf(seq[ladder.rows]), y: height - TOP });
    return pts;
  }

  const reduced = ctx.reducedMotion; // 전역 대신 주입값 사용(Global Constraint)
  let cancelled = false;

  function animateOne(i, done) {
    const pts = pathPoints(i);
    token.style.background = `radial-gradient(circle at 35% 30%, #fff, ${participants[i].color})`;
    let k = 0;
    token.style.left = (pts[0].x - 8) + 'px'; token.style.top = (pts[0].y - 8) + 'px';
    function next() {
      if (cancelled) return;
      k++;
      if (k >= pts.length) { done(); return; }
      token.style.left = (pts[k].x - 8) + 'px'; token.style.top = (pts[k].y - 8) + 'px';
      setTimeout(next, reduced ? 0 : 130);
    }
    setTimeout(next, reduced ? 0 : 130);
  }

  function finish() {
    ctx.mascot.setState('celebrate');
    const map = participants.map((p, i) => ({ name: p.name, color: p.color, result: results[assignments[i]] }));
    const body = document.createElement('div');
    body.innerHTML = map.map(m => `<div style="margin:6px 0"><b style="color:${m.color}">${m.name}</b> → ${m.result}</div>`).join('');
    ctx.showResult({
      title: '사다리 결과 🪜',
      bodyEl: body,
      actions: [
        { label: '다시하기', onClick: () => { ctx.hideResult(); ctx.navigate('#/game/ladder'); } },
        { label: '홈', kind: 'secondary', onClick: () => { ctx.hideResult(); ctx.navigate('#/'); } },
      ],
    });
  }

  // 참가자 순차 애니메이션 → 끝나면 결과
  function runFrom(i) {
    if (cancelled) return;
    if (i >= n) { finish(); return; }
    animateOne(i, () => runFrom(i + 1));
  }
  skip.addEventListener('click', () => { cancelled = true; finish(); });
  if (reduced) finish(); else runFrom(0);
}
```

- [ ] **Step 2: 수동 확인 — 정상 경로**

Run: `http://localhost:8000` → 참가자 4명 → 사다리 → 결과 항목 확인 → "출발!"
Expected: 사다리 SVG가 그려지고, 토큰이 참가자별로 선을 따라 좌우로 꺾이며 내려간 뒤 결과 모달에 "이름 → 결과" 매핑 표시. 말랑이가 thinking→celebrate로 전환.

- [ ] **Step 3: 수동 확인 — 결과 정확성(전단사)**

결과 모달의 매핑에서 **각 결과 항목이 정확히 한 번씩** 나오는지 확인(당첨 1개, 꽝 나머지). "다시하기" → 새 사다리로 재실행, "홈" → 허브 복귀.

- [ ] **Step 4: 수동 확인 — reduced-motion**

OS의 "동작 줄이기" 켠 상태(또는 브라우저 DevTools의 Rendering > Emulate prefers-reduced-motion)에서 "출발!" → 애니메이션 없이 즉시 결과 표시.

- [ ] **Step 5: 커밋**

```bash
git add src/games/ladder/play.js
git commit -m "$(printf 'feat: ladder rendering, token animation, result flow\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
```

---

### Task 16: 최종 통합 검증 + 문서 갱신

**Files:**
- Modify: `README.md` (상태 체크 갱신)

**Interfaces:**
- Consumes: 전체.
- Produces: 없음(검증/문서).

- [ ] **Step 1: 전체 테스트 실행**

Run: `node --test`
Expected: PASS — random(5) + store(4) + theme(2) + router(3) + participant(4) + ladder.logic(5) = 23 tests, 0 fail.

- [ ] **Step 2: 엔드투엔드 수동 시나리오 (스펙 §6 흐름)**

Run: `http://localhost:8000`
확인 목록(모두 PASS여야 함):
- [ ] 허브 로드 → 헤더/말랑이/참가자 편집기/게임 그리드 표시
- [ ] 참가자 추가·삭제·이름수정, 새로고침 후 유지
- [ ] 테마 토글(다크↔라이트) + 유지
- [ ] 사다리: 설정 → 출발 → 애니메이션 → 결과(매핑 정확) → 다시하기/홈
- [ ] 참가자 2명 미만 시 시작 차단
- [ ] "준비 중" 게임 카드는 잠금(클릭 무반응)
- [ ] 콘솔 에러 0

- [ ] **Step 3: `README.md` 상태 갱신**

`## 현재 상태` 아래 항목 교체:
```markdown
- [x] 아이디어 브레인스토밍
- [x] 디자인 컨셉 확정 (**C-다크 · 젤리 팝 + 마스코트 말랑이**)
- [x] 설계 문서 작성 + 검수 반영
- [x] 구현 계획 수립
- [x] Phase 0 프레임워크 + Phase 1 사다리 타기 구현
- [ ] Phase 2 이후(룰렛·손가락 짚기·공유 …)
```

- [ ] **Step 4: 커밋 + 푸시**

```bash
git add README.md
git commit -m "$(printf 'chore: mark Phase 0-1 complete\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>')"
git push
```

- [ ] **Step 5: GitHub Pages 배포 확인**

`https://windowforsun.github.io/go-and-play/` 접속(캐시로 1~2분 지연 가능) → 허브가 뜨고 사다리 게임이 동작하는지 확인.

---

## Self-Review (작성자 체크 결과)

**1. Spec coverage (스펙 §별 대응):**
- §2 기술결정: Task 1(스캐폴드), 11(라우터·동적import 배선) ✓
- §2.1 개발실행: Global Constraints + Task 1 serve 스크립트 ✓
- §3 게임 카탈로그: Task 10 GAME_LIST(6종 그리드; ladder 활성, 나머지 잠금) — 전체 13종은 Phase 2+에서 추가(이 플랜은 §10의 0-1단계 범위) ✓
- §4 디자인: Task 1(토큰), 6(마스코트), 7(헤더) ✓
- §5 아키텍처(게임 규격/ctx): Task 10-11(ctx), 14(모듈 규격) ✓
- §6 화면흐름: Task 11(허브), 14(설정), 15(플레이/결과) ✓
- §6.1 공유: Task 9 share 스텁(Phase 2 활성화 — 이 플랜은 흐름에서 미노출, 스펙과 일치) ✓
- §7 데이터모델: Task 3(Participant/저장), 8(참가자), 15(assign 결과) ✓
- §8 디자인시스템: Task 1(tokens/app.css) ✓
- §9 구조: 파일구조 섹션과 일치(jelly-button.js는 YAGNI로 CSS 대체 — 명시) ✓
- §10 단계: Phase 0(T1-11) + Phase 1(T12-15) ✓
- §11 테스트: node:test(순수 로직) + 수동(UI) ✓
- §12 엣지: 2명 미만(T11), reduced-motion(T15), 손상 저장(T3), 오프라인(정적+localStorage) ✓

**2. Placeholder scan:** `play.js`는 Task 14에서 명시적 임시 스텁 → Task 15에서 완성(플레이스홀더 아님, 순서 명시). 그 외 "TBD/적절히 처리" 없음 ✓

**3. Type consistency:** `ctx`(participants/resultItems/navigate/showResult/hideResult/share/mascot/sound/theme/random) — T11 정의와 T14-15 사용 일치. `mascot.setState`, `modal.show/hide`, `generateLadder/computeAssignments/rungKey` 시그니처 태스크 간 일치 ✓

> 미해결로 남긴 알려진 사항(의도적): 결과 항목 개수 = 참가자 수로 고정(사다리 특성). 항목 룰렛 등 변형은 범위 밖(스펙 §13).

## 검수 반영 (계획 리뷰 2026-07-19)

대화 결정 ↔ 계획 전수 대조 + 순수 로직 실측(node:test 23개 PASS, 전단사 4000조합 위반 0)에서 나온 항목 반영:

- **E1**(버그): SVG 세로 레일 `stroke`를 프레젠테이션 속성 대신 `line.style.stroke`로 설정(CSS 변수 해석). — Task 15
- **C1**(원칙): `prefers-reduced-motion`을 `ctx.reducedMotion`으로 주입, 게임의 `window` 직접 접근 제거. — Task 11/15
- **C2**(스펙 정합): UI 검증은 로컬 서버 수동으로 확정, Playwright는 선택/후순위(스펙 §11 정정).
- **A1**(DRY): 경로 계산을 `ladder.logic`의 `tracePath` 단일 출처로 통합(애니메이션·배정 규칙 공유) + 일치 테스트. — Task 13/15
- **D1**(오타): Task 1 제목 "토큰" 수정.
- 남긴 선택 항목(미반영): A2(초기 테마 아이콘), A3(ctx.theme 스냅샷), O1(사다리 가로 스크롤), O2(게임별 CSS 정적링크), O3(alert 안내).
