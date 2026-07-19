import { createMascot } from './mascot/mallang.js';
const app = document.getElementById('app');
const m = createMascot();
app.appendChild(m.el);
