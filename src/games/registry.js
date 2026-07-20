// 게임 카탈로그(스펙 §3). load가 함수면 플레이 가능, null이면 "예정".
export const GAME_LIST = [
  { id: 'ladder', name: '사다리 타기', icon: '🪜', type: 'assign', load: () => import('./ladder/index.js') },
  { id: 'roulette', name: '룰렛', icon: '🎡', type: 'pick-one', load: () => import('./roulette/index.js') },
  { id: 'finger', name: '손가락 짚기', icon: '👆', type: 'pick-one', load: () => import('./finger/index.js') },
  { id: 'draw', name: '제비뽑기', icon: '🎴', type: 'assign', load: () => import('./draw/index.js') },
  { id: 'bomb', name: '폭탄 돌리기', icon: '💣', type: 'pick-one', load: () => import('./bomb/index.js') },
  { id: 'dice', name: '주사위', icon: '🎲', type: 'order', load: () => import('./dice/index.js') },
  { id: 'updown', name: '숫자 업다운', icon: '🔢', type: 'contest', load: () => import('./updown/index.js') },
  { id: 'reaction', name: '반응속도', icon: '⚡', type: 'contest', load: () => import('./reaction/index.js') },
  { id: 'rps', name: '가위바위보', icon: '✊', type: 'contest', load: () => import('./rps/index.js') },
  { id: 'lineup', name: '랜덤 줄 세우기', icon: '🚶', type: 'order', load: () => import('./lineup/index.js') },
  { id: 'dart', name: '원판 다트', icon: '🎯', type: 'pick-one', load: () => import('./dart/index.js') },
  { id: 'russian', name: '러시안 룰렛', icon: '🔫', type: 'pick-one', load: () => import('./russian/index.js') },
  { id: 'cardflip', name: '카드 뒤집기', icon: '🃏', type: 'pick-one', load: () => import('./cardflip/index.js') },
  { id: 'tapbattle', name: '동시 탭 대결', icon: '🔥', type: 'contest', load: () => import('./tapbattle/index.js') },
];

export function findGame(id) { return GAME_LIST.find(g => g.id === id) || null; }
