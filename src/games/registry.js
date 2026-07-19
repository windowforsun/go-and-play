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
