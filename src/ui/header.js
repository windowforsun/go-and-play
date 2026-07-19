import { createMascot } from '../mascot/mallang.js';

export function createHeader({ onToggleTheme }) {
  const el = document.createElement('div');

  const bar = document.createElement('div');
  bar.className = 'app-header';
  const logo = document.createElement('div');
  logo.className = 'logo';
  logo.textContent = 'GO & PLAY';
  const toggle = document.createElement('button');
  toggle.className = 'theme-toggle';
  toggle.textContent = '🌙';
  toggle.setAttribute('aria-label', '테마 전환');
  toggle.addEventListener('click', () => {
    onToggleTheme();
    toggle.textContent = document.documentElement.getAttribute('data-theme') === 'dark' ? '🌙' : '☀️';
  });
  bar.append(logo, toggle);

  const hero = document.createElement('div');
  hero.className = 'hero';
  const mascot = createMascot();
  hero.appendChild(mascot.el);

  el.append(bar, hero);
  return { el, mascot };
}
