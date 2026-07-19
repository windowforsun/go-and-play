import { createHeader } from './ui/header.js';
import { createResultModal } from './ui/result-modal.js';
const app = document.getElementById('app');
const header = createHeader({ onToggleTheme: () => {
  const cur = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
}});
app.appendChild(header.el);
const modal = createResultModal();
app.appendChild(modal.el);
const open = document.createElement('button');
open.className = 'jelly-btn'; open.textContent = '모달 테스트';
open.addEventListener('click', () => modal.show({
  title: '결과!', bodyHtml: '<p>민수 → 당첨 🎉</p>',
  actions: [{ label: '다시하기', onClick: () => modal.hide() }, { label: '홈', kind: 'secondary', onClick: () => modal.hide() }],
}));
app.appendChild(open);
