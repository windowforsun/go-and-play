# 고 앤 플레이 (go-and-play) — 설계 문서

- 작성일: 2026-07-19
- 저장소: https://github.com/windowforsun/go-and-play
- 상태: 설계 확정, 구현 계획 대기

## 1. 개요 / 목표

사다리 타기·룰렛·손가락 짚기 등 **내기하거나 술래를 정하는 게임 모음** 웹앱.
브라우저에서 동작하는 정적 사이트로 **GitHub Pages**에 배포한다.

- 여러 게임을 **허브에서 골라 들어가는 구조**로, 게임을 하나씩 붙여나간다.
- 모바일에서 편하게 쓸 수 있어야 한다(손가락 짚기 등 터치 게임 포함).
- 온라인(멀티플레이)은 이후 단계로 확장 가능하되, 지금 구조가 발목을 잡지 않아야 한다.

## 2. 기술 결정

| 항목 | 결정 | 이유 |
|------|------|------|
| 스택 | **순수 HTML/CSS/JS + ES 모듈** | 빌드 없이 푸시=배포. 고장 요소 최소. 게임 로직에 프레임워크 불필요 |
| 앱 형태 | **SPA + 해시 라우터**(`#/ladder`) | 공통 셸 1회 존재, 게임 코드 지연 로드. 정적 호스팅에서 새로고침/뒤로가기 정상 |
| 게임 로딩 | **동적 import** `import('./games/<id>/index.js')` | 선택한 게임만 로드해 가볍게 유지 |
| 배포 | GitHub Pages (`main` / root) | 정적 호스팅 |
| 저장 | **localStorage** | 백엔드 없음, 오프라인 동작 |
| 온라인(추후) | 외부 실시간 서비스 어댑터(Firebase/Supabase/PartyKit/WebRTC) | 프론트는 그대로, 실시간 동기화만 위임 |

## 3. 디자인 컨셉

**C-다크 · 젤리 팝 + 마스코트** (브레인스토밍에서 확정)

- 다크 그라데이션 배경 + 떠다니는 글로우 blob
- **라이트/다크 토글** 지원 (기본값: 다크)
- 대표 마스코트 **말랑이**(젤리 블롭): 몸통 핑크→퍼플 그라데이션, 광택, 볼터치, 반짝이
- 폰트: `Jua`(둥근 한글). 젤리 버튼, 부드러운 그림자, 눌리는 인터랙션
- 애니메이션: float / squash-stretch wobble / 눈 깜빡임(SVG SMIL) / 배경 드리프트 / 결과 연출 / 버튼 글로우
- 접근성: `prefers-reduced-motion` 시 애니메이션 off

> 컨셉 목업은 `brainstorm/concepts/`에 있으며 **정식 코드가 아니다**(결정용). 정식 코드와 섞지 않는다.

## 4. 아키텍처

### 4.1 허브 + 게임 모듈

앱 셸(허브)이 화면 셸(헤더·마스코트·테마·배경)을 소유하고, 라우터가 뷰를 전환한다.
각 게임은 **동일한 규격의 모듈**로 만들어 허브에 꽂는다.

### 4.2 게임 규격 (플러그인 인터페이스)

```js
// games/<id>/index.js
export default {
  id: 'ladder',
  name: '사다리 타기',
  icon: '🪜',
  type: 'assign',            // 'assign'(N:N 매칭) | 'pick-one'(1명 뽑기) | 'order'(순서)
  minPlayers: 2,
  mount(container, ctx) {},  // container에 게임 UI 렌더, 시작
  unmount() {},              // 타이머/이벤트 정리
}
```

- `type`이 결과 성격을 정의해 결과 화면을 표준화한다.
- 게임은 오직 `ctx`에만 의존한다 → 독립적으로 이해·테스트·교체 가능.

### 4.3 ctx (공통 서비스)

```
ctx = {
  participants,          // 현재 참가자 목록(공통 상태)
  results,               // 게임이 설정하는 결과 항목(예: 당첨/꽝)
  navigate(route),       // 화면 이동
  showResult(payload),   // 표준 결과 모달 표시
  mascot,                // 말랑이 상태 제어: idle / thinking / celebrate
  sound,                 // 효과음(설정 on/off)
  theme,                 // 현재 테마 읽기
  random,                // 시드 가능한 난수/셔플 유틸(테스트용)
}
```

## 5. 화면 흐름

```
허브(게임 그리드 + 말랑이)
  → 설정(참가자 이름 입력 + 게임별 옵션/결과 항목)
  → 플레이(게임별 애니메이션, 말랑이 thinking)
  → 결과(말랑이 celebrate + 매칭/당첨 표시 + [다시하기][공유][홈])
```

- 참가자 목록은 **공통 상태**라 한 번 입력하면 다른 게임에서도 재사용된다.
- `type`별 결과 화면:
  - `assign`: 참가자 ↔ 결과 매핑 표
  - `pick-one`: 당첨/술래 1명 강조
  - `order`: 순번 리스트

## 6. 데이터 모델 & 저장

```
Participant = { id: string, name: string, color: string }
GameConfig  = 게임별 옵션(예: 사다리 결과 항목 배열)
Result      = assign: Map<participantId, resultItem>
              pick-one: participantId
              order: participantId[]
```

- **localStorage 저장 대상**: 마지막 참가자 목록, 테마, 사운드 on/off.
- 백엔드 없음. 전부 클라이언트.

## 7. 디자인 시스템

- `styles/tokens.css`: 색상(라이트/다크 각각), 라운드, 그림자, 애니메이션 duration, 폰트 변수
- 테마 전환: `<html data-theme="dark|light">` + CSS 변수 스위칭
- 젤리 버튼/카드 컴포넌트, 결과 모달, 참가자 편집기 = `src/ui/`
- 말랑이: `src/mascot/mallang.js` — SVG + 상태별 애니메이션(idle/thinking/celebrate), 재사용 가능한 심볼

## 8. 프로젝트 구조

```
go-and-play/
├── index.html              # 앱 셸(SPA 진입점, Pages 루트)
├── styles/
│   ├── tokens.css          # 디자인 토큰(라이트/다크)
│   └── app.css
├── src/
│   ├── main.js             # 부트스트랩
│   ├── core/
│   │   ├── router.js       # 해시 라우터
│   │   ├── store.js        # 상태 + localStorage
│   │   ├── theme.js        # 라이트/다크 토글
│   │   ├── random.js       # 셔플/난수(시드 가능)
│   │   └── sound.js
│   ├── ui/
│   │   ├── header.js
│   │   ├── participant-editor.js
│   │   ├── result-modal.js
│   │   └── jelly-button.js
│   ├── mascot/
│   │   └── mallang.js
│   └── games/
│       ├── registry.js     # 사용 가능한 게임 목록
│       └── ladder/
│           ├── index.js        # 게임 모듈(규격 구현, DOM)
│           ├── ladder.logic.js # 순수 로직(경로 계산·배정, DOM 없음)
│           └── ladder.css
├── tests/                  # *.logic.js 단위 테스트(node:test)
├── brainstorm/             # 목업(정식 코드 아님)
└── README.md
```

**원칙**: 게임 로직(`*.logic.js`)은 DOM 없이 순수 함수로 유지 → 독립 테스트. 화면(`index.js`)과 분리.

## 9. 구현 순서 (단계)

- **0단계 — 프레임워크**: 앱 셸, 허브, 해시 라우터, 스토어, 테마 토글, 말랑이, 참가자 편집기, 공통 UI, 게임 규격, 결과 모달, 디자인 토큰. (게임 없이도 껍데기가 돈다.)
- **1단계 — 사다리 타기**: 첫 완성 게임(`assign`). 사다리 생성·경로 계산 로직 + 선 따라 내려가는 애니메이션.
- **2단계**: 룰렛(`pick-one`), 손가락 짚기(`pick-one`, 멀티터치).
- **3단계**: 제비뽑기·폭탄 돌리기·주사위·순번 정하기·가위바위보 등.
- **4단계(추후)**: 온라인 멀티플레이 — 실시간 서비스 어댑터 추가(방 코드로 참여).

각 단계는 자체 spec → plan → 구현 사이클을 가질 수 있다. 이 문서는 **0~1단계**를 우선 대상으로 한다.

## 10. 테스트 전략

- **순수 로직**(`random.js`, 사다리 경로/배정): `node:test`로 단위 테스트. DOM 미의존이라 그대로 실행 가능.
- **공정성**: 셔플이 편향 없는지, 배정이 1:1인지 검증.
- **UI**: 수동 확인 + Playwright 스모크 테스트(허브 진입, 게임 시작, 결과 표시).
- **접근성**: reduced-motion에서 동작 확인.

## 11. 예외 / 엣지 케이스

- 참가자 2명 미만 → 시작 불가 안내
- 이름 중복/공백 → 허용하되 구분(색/번호), 공백 트림
- 참가자 수 ≠ 결과 수(사다리) → 자동 맞춤 또는 경고
- 참가자 과다 → 스크롤/레이아웃 대응
- reduced-motion → 애니메이션 생략, 결과는 즉시 표시
- 오프라인 → 정적+localStorage라 정상 동작

## 12. 범위 밖 (YAGNI, 지금 안 함)

- 온라인 멀티플레이(4단계로 연기)
- 계정/로그인, 서버 저장
- 다국어(우선 한국어)
- 사운드는 0단계에 훅만 두고 실제 효과음은 이후

## 13. 비고 — 브레인스토밍 분리

`brainstorm/`의 목업은 아이디어 확정용이며 **정식 코드에 재사용하지 않는다**. 컨셉 확정(C-다크)이 끝났으므로, 정식 구현은 위 구조로 새로 작성한다. 목업은 참고/아카이브로 남긴다.
