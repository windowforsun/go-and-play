export function createShare() {
  return {
    async share(payload) {
      if (navigator.share) { try { await navigator.share(payload); return; } catch { /* 취소 등 무시 */ } }
      if (navigator.clipboard) { await navigator.clipboard.writeText(`${payload.title}\n${payload.text}`); }
    },
  };
}
