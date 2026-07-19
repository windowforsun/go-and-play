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
