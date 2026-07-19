import { createHeader } from './ui/header.js';
const app = document.getElementById('app');
const header = createHeader({ onToggleTheme: () => {
  const cur = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
}});
app.appendChild(header.el);
