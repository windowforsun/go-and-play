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
