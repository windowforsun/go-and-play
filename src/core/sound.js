// Phase 0 스텁: 인터페이스만 고정. 실제 효과음은 Phase 2+.
export function createSound(enabled = true) {
  let on = enabled;
  return { play() { /* no-op until Phase 2 */ }, setEnabled(v) { on = v; }, get enabled() { return on; } };
}
