const SVGNS = 'http://www.w3.org/2000/svg';
const CX = 150, CY = 150, R = 140;
let interval = null, cancelled = false;

export default {
  id: 'dart',
  name: '원판 다트',
  icon: '🎯',
  type: 'pick-one',
  minPlayers: 2,
  mount(container, ctx) { this._c = container; cancelled = false; render(container, ctx); },
  unmount() { cancelled = true; if (interval) { clearInterval(interval); interval = null; } if (this._c) this._c.innerHTML = ''; },
};

function polar(deg, r) {
  const rad = deg * Math.PI / 180;
  return { x: CX + r * Math.sin(rad), y: CY - r * Math.cos(rad) };
}

function render(container, ctx) {
  const ps = ctx.participants;
  const n = ps.length;
  const slice = 360 / n;
  let angle = 0, spinning = false;
  let sectors = [];

  const panel = document.createElement('div');
  panel.className = 'game-panel';
  panel.innerHTML = '<h2>🎯 원판 다트</h2><div class="hint">돌아가는 바늘을 타이밍 맞춰 멈추면 그 칸이 당첨!</div>';

  const stage = document.createElement('div');
  stage.className = 'roulette-stage';
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('width', 300); svg.setAttribute('height', 300); svg.setAttribute('viewBox', '0 0 300 300');

  ps.forEach((p, i) => {
    const a1 = i * slice, a2 = (i + 1) * slice;
    const p1 = polar(a1, R), p2 = polar(a2, R);
    const large = (a2 - a1) > 180 ? 1 : 0;
    const path = document.createElementNS(SVGNS, 'path');
    path.setAttribute('d', `M ${CX} ${CY} L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${R} ${R} 0 ${large} 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} Z`);
    path.setAttribute('fill', p.color);
    path.style.stroke = 'var(--bg2)'; path.setAttribute('stroke-width', '2');
    svg.appendChild(path);
    sectors.push(path);
    const lp = polar(a1 + slice / 2, R * 0.66);
    const t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('x', lp.x.toFixed(1)); t.setAttribute('y', lp.y.toFixed(1));
    t.setAttribute('fill', '#fff'); t.setAttribute('font-size', n > 8 ? '9' : '11');
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'middle');
    t.setAttribute('transform', `rotate(${a1 + slice / 2} ${lp.x.toFixed(1)} ${lp.y.toFixed(1)})`);
    t.textContent = p.name;
    svg.appendChild(t);
  });

  // 중심에서 뻗는 바늘
  const needle = document.createElementNS(SVGNS, 'g');
  const line = document.createElementNS(SVGNS, 'line');
  line.setAttribute('x1', CX); line.setAttribute('y1', CY);
  line.setAttribute('x2', CX); line.setAttribute('y2', CY - R + 8);
  line.setAttribute('stroke', '#fff'); line.setAttribute('stroke-width', '4'); line.setAttribute('stroke-linecap', 'round');
  const tip = document.createElementNS(SVGNS, 'circle');
  tip.setAttribute('cx', CX); tip.setAttribute('cy', CY - R + 8); tip.setAttribute('r', '6'); tip.setAttribute('fill', '#fff');
  needle.append(line, tip);
  needle.style.transformOrigin = 'center'; needle.style.transformBox = 'fill-box';
  svg.appendChild(needle);
  stage.appendChild(svg);
  stage.insertAdjacentHTML('beforeend', '<div class="roulette-center">📍</div>');

  const actions = document.createElement('div');
  actions.className = 'game-actions';
  const throwBtn = mkBtn('던지기 🎯', 'jelly-btn', doThrow);
  actions.append(throwBtn, mkBtn('홈', 'jelly-btn secondary', () => ctx.navigate('#/')));

  panel.append(stage, actions);
  container.innerHTML = '';
  container.appendChild(panel);

  startSpin();

  function startSpin() {
    spinning = true;
    throwBtn.textContent = '던지기 🎯';
    sectors.forEach(s => { s.setAttribute('stroke-width', '2'); s.setAttribute('stroke', 'var(--bg2)'); s.style.stroke = 'var(--bg2)'; });
    ctx.mascot.setState('thinking');
    if (interval) clearInterval(interval);
    interval = setInterval(() => {
      if (cancelled) return;
      angle = (angle + 13) % 360;
      needle.style.transform = `rotate(${angle}deg)`;
    }, 16);
  }

  function doThrow() {
    if (cancelled) return;
    if (!spinning) { startSpin(); return; }
    spinning = false;
    if (interval) { clearInterval(interval); interval = null; }
    const landed = Math.floor(((angle % 360) + 360) % 360 / slice) % n;
    sectors[landed].setAttribute('stroke-width', '6');
    sectors[landed].setAttribute('stroke', '#fff'); sectors[landed].style.stroke = '#fff';
    throwBtn.textContent = '다시 🎯';
    ctx.mascot.setState('celebrate');
    const body = document.createElement('div');
    body.style.fontSize = '22px';
    const b = document.createElement('b'); b.style.color = ps[landed].color; b.textContent = ps[landed].name;
    body.append(document.createTextNode('🎯 '), b, document.createTextNode(' 당첨!'));
    ctx.showResult({
      title: '명중! 🎯',
      bodyEl: body,
      actions: [
        { label: '다시', onClick: () => { ctx.hideResult(); startSpin(); } },
        { label: '홈', kind: 'secondary', onClick: () => { ctx.hideResult(); ctx.navigate('#/'); } },
      ],
    });
  }
}

function mkBtn(text, cls, on) {
  const b = document.createElement('button');
  b.className = cls; b.textContent = text; b.addEventListener('click', on);
  return b;
}
