export const PALETTE = ['#ff3d84', '#38b6aa', '#ffd45c', '#a06bff', '#6db8ff', '#ff9a76', '#4fe0d0', '#ff6fae'];

export function participantColor(index) { return PALETTE[index % PALETTE.length]; }
export function normalizeName(raw) { return String(raw).trim(); }
export function makeParticipant(name, index) {
  return { id: 'p' + index, name: normalizeName(name), color: participantColor(index) };
}
export function canStart(participants) { return participants.length >= 2; }

export function createParticipantEditor({ initial = [], onChange = () => {} }) {
  let items = initial.length
    ? initial.slice()
    : [makeParticipant('참가자 1', 0), makeParticipant('참가자 2', 1)];

  const el = document.createElement('div');
  el.className = 'participant-editor card';

  function reindex() { items = items.map((p, i) => ({ ...p, id: 'p' + i, color: participantColor(i) })); }
  function emit() { onChange(items); }

  function render() {
    el.innerHTML = '<h3 class="pe-title">참가자</h3>';
    const list = document.createElement('div');
    list.className = 'pe-list';
    items.forEach((p, i) => {
      const row = document.createElement('div');
      row.className = 'pe-row';
      const dot = document.createElement('span');
      dot.className = 'pe-dot'; dot.style.background = p.color;
      const input = document.createElement('input');
      input.className = 'pe-input'; input.value = p.name;
      input.addEventListener('input', () => { items[i] = { ...items[i], name: normalizeName(input.value) }; emit(); });
      const del = document.createElement('button');
      del.className = 'pe-del'; del.textContent = '✕'; del.setAttribute('aria-label', '삭제');
      del.addEventListener('click', () => { items.splice(i, 1); reindex(); render(); emit(); });
      row.append(dot, input, del);
      list.appendChild(row);
    });
    const add = document.createElement('button');
    add.className = 'jelly-btn secondary pe-add'; add.textContent = '+ 참가자 추가';
    add.addEventListener('click', () => { items.push(makeParticipant('참가자 ' + (items.length + 1), items.length)); render(); emit(); });
    el.append(list, add);
  }

  render();
  emit();
  return { el, getParticipants: () => items };
}
