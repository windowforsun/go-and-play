import { spinToIndex, indexAtPointer } from './roulette.logic.js';

const SVGNS = 'http://www.w3.org/2000/svg';
const CX = 150, CY = 150, R = 140;

let timer = null, cancelled = false;

export default {
  id: 'roulette',
  name: '룰렛',
  icon: '🎡',
  type: 'pick-one',
  minPlayers: 2,
  mount(container, ctx) { this._c = container; cancelled = false; render(container, ctx); },
  unmount() { cancelled = true; if (timer) { clearTimeout(timer); timer = null; } if (this._c) this._c.innerHTML = ''; },
};

function polar(deg, r) {
  const rad = deg * Math.PI / 180; // 0deg = 상단(12시), 시계방향
  return { x: CX + r * Math.sin(rad), y: CY - r * Math.cos(rad) };
}

function render(container, ctx) {
  const ps = ctx.participants;
  const n = ps.length;
  const slice = 360 / n;
  let currentDeg = 0;
  let spinning = false;

  const panel = document.createElement('div');
  panel.className = 'game-panel';
  panel.innerHTML = '<h2>🎡 룰렛</h2><div class="hint">돌려서 멈춘 칸이 당첨!</div>';

  const stage = document.createElement('div');
  stage.className = 'roulette-stage';
  stage.innerHTML = '<div class="roulette-pointer">🔻</div>';

  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('width', 300); svg.setAttribute('height', 300);
  svg.setAttribute('viewBox', '0 0 300 300');
  const wheel = document.createElementNS(SVGNS, 'g');
  wheel.setAttribute('class', 'roulette-wheel');

  const sectors = [];
  ps.forEach((p, i) => {
    const a1 = i * slice, a2 = (i + 1) * slice;
    const p1 = polar(a1, R), p2 = polar(a2, R);
    const large = (a2 - a1) > 180 ? 1 : 0;
    const path = document.createElementNS(SVGNS, 'path');
    path.setAttribute('d', `M ${CX} ${CY} L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} A ${R} ${R} 0 ${large} 1 ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} Z`);
    path.setAttribute('fill', p.color);
    path.setAttribute('stroke', 'var(--bg2)');
    path.style.stroke = 'var(--bg2)';
    path.setAttribute('stroke-width', '2');
    wheel.appendChild(path);
    sectors.push(path);

    const lp = polar(a1 + slice / 2, R * 0.66);
    const t = document.createElementNS(SVGNS, 'text');
    t.setAttribute('x', lp.x.toFixed(1)); t.setAttribute('y', lp.y.toFixed(1));
    t.setAttribute('fill', '#fff'); t.setAttribute('font-size', n > 8 ? '9' : '11');
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('dominant-baseline', 'middle');
    t.setAttribute('transform', `rotate(${a1 + slice / 2} ${lp.x.toFixed(1)} ${lp.y.toFixed(1)})`);
    t.textContent = p.name;
    wheel.appendChild(t);
  });
  svg.appendChild(wheel);
  stage.appendChild(svg);
  stage.insertAdjacentHTML('beforeend', '<div class="roulette-center">🎯</div>');

  const actions = document.createElement('div');
  actions.className = 'game-actions';
  const spinBtn = mkBtn('돌리기 🎡', 'jelly-btn', spin);
  const homeBtn = mkBtn('홈', 'jelly-btn secondary', () => ctx.navigate('#/'));
  actions.append(spinBtn, homeBtn);

  panel.append(stage, actions);
  container.innerHTML = '';
  container.appendChild(panel);
  ctx.mascot.setState('idle');

  function spin() {
    if (spinning || cancelled) return;
    spinning = true;
    ctx.mascot.setState('thinking');
    sectors.forEach(s => s.setAttribute('stroke-width', '2'));
    const winner = Math.floor(ctx.random.rng() * n);
    const extra = 5 + Math.floor(ctx.random.rng() * 4);
    const desired = spinToIndex(winner, n, 0) % 360;
    const curMod = ((currentDeg % 360) + 360) % 360;
    const delta = ((desired - curMod + 360) % 360) + extra * 360;
    currentDeg += delta;
    wheel.style.transition = 'transform 3.8s cubic-bezier(.16,.84,.24,1)';
    // 다음 프레임에 적용해야 transition이 걸림
    timer = setTimeout(() => {
      if (cancelled) return;
      wheel.style.transform = `rotate(${currentDeg}deg)`;
      timer = setTimeout(() => finish(winner), 3900);
    }, 30);
  }

  function finish(winner) {
    if (cancelled) return;
    spinning = false;
    // 검증: 최종 각도가 실제로 winner를 가리키는지
    const landed = indexAtPointer(currentDeg, n);
    const w = landed; // 시각과 일치하는 실제 도착 칸
    sectors[w].setAttribute('stroke-width', '6');
    sectors[w].setAttribute('stroke', '#fff');
    ctx.mascot.setState('celebrate');
    ctx.showResult({
      title: '룰렛 결과 🎡',
      bodyHtml: `<div style="font-size:22px">🎉 <b style="color:${ps[w].color}">${escapeHtml(ps[w].name)}</b> 당첨!</div>`,
      actions: [
        { label: '다시 돌리기', onClick: () => { ctx.hideResult(); ctx.mascot.setState('idle'); spin(); } },
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
