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
