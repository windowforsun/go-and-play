export function createResultModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay hidden';
  const box = document.createElement('div');
  box.className = 'modal-box card';
  overlay.appendChild(box);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) hide(); });

  function hide() { overlay.classList.add('hidden'); box.innerHTML = ''; }
  function show({ title, bodyEl, bodyHtml, actions = [] }) {
    box.innerHTML = '';
    const h = document.createElement('h2');
    h.className = 'modal-title'; h.textContent = title;
    box.appendChild(h);
    const body = document.createElement('div');
    body.className = 'modal-body';
    if (bodyEl) body.appendChild(bodyEl);
    else if (bodyHtml) body.innerHTML = bodyHtml;
    box.appendChild(body);
    const row = document.createElement('div');
    row.className = 'modal-actions';
    actions.forEach(a => {
      const btn = document.createElement('button');
      btn.className = 'jelly-btn' + (a.kind === 'secondary' ? ' secondary' : '');
      btn.textContent = a.label;
      btn.addEventListener('click', () => a.onClick());
      row.appendChild(btn);
    });
    box.appendChild(row);
    overlay.classList.remove('hidden');
  }
  return { el: overlay, show, hide };
}
