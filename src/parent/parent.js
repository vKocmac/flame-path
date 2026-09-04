// Parent Mode (Βήμα 1: λειτουργικό, όχι όμορφο).
// Είσοδος: 5 γρήγορα αγγίγματα στη γραμμή κατάστασης → PIN.
// Την πρώτη φορά ο γονιός ΟΡΙΖΕΙ το PIN (αποθηκεύεται μόνο σε αυτή τη συσκευή).

import * as store from '../shared/storage.js';
import { splitGraphemes, classForGrapheme, distractorsFor } from '../shared/graphemes.js';

const root = document.getElementById('parent-root');
let state = store.loadState();
if (!store.activeProfile(state)) store.createProfile(state, 'Νίντζα');

// Κρυφή είσοδος: 5 αγγίγματα στο ΦΕΓΓΑΡΙ (το καλεί η TitleScene μέσω
// window.flameParent.open). Εφεδρικά, 5 αγγίγματα στην κάτω δεξιά γωνία —
// χρήσιμο αν κάποτε το φεγγάρι φύγει από τη σκηνή.
let taps = [];
const fallback = document.getElementById('status');
if (fallback) {
  fallback.addEventListener('click', () => {
    const t = Date.now();
    taps = taps.filter((x) => t - x < 2500);
    taps.push(t);
    if (taps.length >= 5) { taps = []; open(); }
  });
}

function open() {
  root.classList.add('open');
  const dev = store.getDevice();
  if (!dev.pin) renderPinSetup();
  else renderPinEntry();
}

function close() {
  root.classList.remove('open');
  root.innerHTML = '';
}

function el(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.firstElementChild;
}

function screen(html) {
  root.innerHTML = '';
  const wrap = el(`<div class="pm-wrap">${html}</div>`);
  const x = el('<button class="pm-close" aria-label="Κλείσιμο">✕</button>');
  x.addEventListener('click', close);
  root.appendChild(x);
  root.appendChild(wrap);
  return wrap;
}

// Οι λέξεις της ορθογραφίας δουλεύονται σε πεζά. Το τελικό σίγμα
// αποκαθίσταται αν ο γονιός έγραψε κεφαλαία (ΟΔΟΣ → οδος → οδός δεν
// ανακτά τόνο, αλλά το ς ναι).
function normalizeWord(raw) {
  return raw.trim().toLowerCase().replace(/σ$/, 'ς');
}

// --- PIN ---

function renderPinSetup() {
  const w = screen(`
    <h2>Πρώτη φορά: όρισε PIN γονέα</h2>
    <p class="pm-note">4 ψηφία. Ισχύει μόνο σε αυτή τη συσκευή και δεν μπαίνει στο αντίγραφο ασφαλείας.</p>
    <input class="pm-input" id="pin1" inputmode="numeric" maxlength="4" placeholder="PIN">
    <div style="height:10px"></div>
    <input class="pm-input" id="pin2" inputmode="numeric" maxlength="4" placeholder="PIN ξανά">
    <p class="pm-error" id="err"></p>
    <button class="pm-btn primary" id="ok">Αποθήκευση</button>`);
  w.querySelector('#ok').addEventListener('click', () => {
    const a = w.querySelector('#pin1').value.trim();
    const b = w.querySelector('#pin2').value.trim();
    if (!/^\d{4}$/.test(a)) { w.querySelector('#err').textContent = 'Θέλει ακριβώς 4 ψηφία.'; return; }
    if (a !== b) { w.querySelector('#err').textContent = 'Δεν ταιριάζουν.'; return; }
    store.saveDevice({ ...store.getDevice(), pin: a });
    renderMain();
  });
}

function renderPinEntry() {
  const w = screen(`
    <h2>PIN γονέα</h2>
    <input class="pm-input" id="pin" inputmode="numeric" maxlength="4" placeholder="••••">
    <p class="pm-error" id="err"></p>
    <button class="pm-btn primary" id="ok">Είσοδος</button>`);
  const check = () => {
    if (w.querySelector('#pin').value.trim() === store.getDevice().pin) renderMain();
    else w.querySelector('#err').textContent = 'Λάθος PIN.';
  };
  w.querySelector('#ok').addEventListener('click', check);
  w.querySelector('#pin').addEventListener('keydown', (e) => { if (e.key === 'Enter') check(); });
}

// --- Κύρια οθόνη ---

// Απόδοση λέξης με ΟΛΟΥΣ τους στόχους έντονους: «λ<b>ι</b>μάν<b>ι</b>».
function wordHTML(wd) {
  const ranges = wd.targets
    .map((t) => t.gap)
    .sort((a, b) => a.start - b.start);
  let html = '', pos = 0;
  for (const r of ranges) {
    html += wd.text.slice(pos, r.start) + '<b>' + wd.text.substr(r.start, r.length) + '</b>';
    pos = r.start + r.length;
  }
  return html + wd.text.slice(pos);
}

function renderMain() {
  const p = store.activeProfile(state);
  const words = p.words.map((wd) => `
    <div class="pm-word" data-id="${wd.id}">
      <span class="w">${wordHTML(wd)}</span>
      <span class="meta">${wd.targets.length} ${wd.targets.length === 1 ? 'σημείο' : 'σημεία'} · επ. ${wd.targets.map((t) => t.level).join('/')}</span>
      <button class="del" aria-label="Διαγραφή">🗑</button>
    </div>`).join('') || '<p class="pm-note">Καμία λέξη ακόμα.</p>';

  const w = screen(`
    <h2>Λέξεις — ${p.profile.name}</h2>
    <h3>Νέα λέξη</h3>
    <div class="pm-row">
      <input class="pm-input" id="word" placeholder="π.χ. λιμάνι" style="flex:1;min-width:200px">
      <button class="pm-btn primary" id="next">Συνέχεια</button>
    </div>
    <div id="pick"></div>
    <h3>Λίστα (${p.words.length})</h3>
    <div id="list">${words}</div>
    <h3>Μεταφορά σε άλλη συσκευή</h3>
    <div class="pm-row">
      <button class="pm-btn" id="exp">Εξαγωγή αντιγράφου</button>
      <button class="pm-btn" id="imp">Εισαγωγή αντιγράφου</button>
      <input type="file" id="impfile" accept=".json,application/json" style="display:none">
    </div>
    <p class="pm-note">Η εξαγωγή κατεβάζει ένα αρχείο. Στην άλλη συσκευή: Εισαγωγή → διάλεξε το αρχείο. Η εισαγωγή ΑΝΤΙΚΑΘΙΣΤΑ ό,τι υπάρχει εκεί.</p>
    <p class="pm-error" id="err"></p>`);

  w.querySelector('#next').addEventListener('click', () => renderPick(w));
  w.querySelector('#word').addEventListener('keydown', (e) => { if (e.key === 'Enter') renderPick(w); });

  w.querySelectorAll('.pm-word .del').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.closest('.pm-word').dataset.id;
      const wd = p.words.find((x) => x.id === id);
      if (confirm(`Διαγραφή «${wd.text}» και της προόδου της;`)) {
        store.removeWord(state, id);
        renderMain();
      }
    });
  });

  w.querySelector('#exp').addEventListener('click', () => {
    const blob = new Blob([store.exportJSON(state)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `flame-path-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });

  const impfile = w.querySelector('#impfile');
  w.querySelector('#imp').addEventListener('click', () => impfile.click());
  impfile.addEventListener('change', () => {
    const f = impfile.files[0];
    if (!f) return;
    if (!confirm('Η εισαγωγή θα ΑΝΤΙΚΑΤΑΣΤΗΣΕΙ όλες τις λέξεις και την πρόοδο σε αυτή τη συσκευή. Συνέχεια;')) return;
    f.text().then((txt) => {
      state = store.importJSON(txt);
      if (!store.activeProfile(state)) state.activeProfileId = state.profiles[0]?.profile.id || null;
      renderMain();
    }).catch((e) => { w.querySelector('#err').textContent = e.message; });
  });
}

// Επιλογή στόχων: η λέξη τεμαχίζεται σε γραφήματα και ΠΡΟΕΠΙΛΕΓΟΝΤΑΙ όλα
// όσα ανήκουν σε κλάση σύγχυσης. Ο γονιός αγγίζει για να αφαιρέσει ή να
// προσθέσει σημεία — κάθε επιλεγμένο σημείο γίνεται ξεχωριστός στόχος.
function renderPick(w) {
  const raw = w.querySelector('#word').value;
  const err = w.querySelector('#err');
  err.textContent = '';
  const text = normalizeWord(raw);
  if (!text || text.includes(' ')) { err.textContent = 'Γράψε μία λέξη, χωρίς κενά.'; return; }
  w.querySelector('#word').value = text;

  const units = splitGraphemes(text);
  let starts = [], pos = 0;
  units.forEach((u) => { starts.push(pos); pos += u.length; });

  const selected = new Set();
  units.forEach((u, i) => { if (classForGrapheme(u)) selected.add(i); });

  const pick = w.querySelector('#pick');
  pick.innerHTML = `
    <p class="pm-note">Επιλεγμένα είναι τα σημεία που θα ελέγχονται — άγγιξε για να αλλάξεις:</p>
    <div class="pm-chips">${units.map((u, i) => `<button class="pm-chip${selected.has(i) ? ' sel' : ''}" data-i="${i}">${u}</button>`).join('')}</div>
    <p class="pm-note" id="suggest"></p>
    <button class="pm-btn primary" id="save">Αποθήκευση λέξης</button>`;

  const refresh = () => {
    const parts = [...selected].sort((a, b) => a - b).map((i) => {
      const g = units[i];
      return `${g} → ${[g, ...distractorsFor(g)].join('/')}`;
    });
    pick.querySelector('#suggest').textContent = parts.length
      ? `Σημεία ελέγχου: ${parts.join(' · ')}`
      : 'Κανένα σημείο — διάλεξε τουλάχιστον ένα φωνήεν.';
    pick.querySelector('#save').disabled = selected.size === 0;
  };
  refresh();

  pick.querySelectorAll('.pm-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const i = Number(chip.dataset.i);
      const g = units[i];
      if (!classForGrapheme(g)) {
        err.textContent = `Το «${g}» δεν ανήκει σε κλάση σύγχυσης: ι/η/υ/ει/οι · ο/ω · ε/αι · ου · διαλυτικά (αυ-αϋ, ευ-εϋ, οι-οϊ, ει-εϊ, αι-αϊ).`;
        return;
      }
      err.textContent = '';
      if (selected.has(i)) { selected.delete(i); chip.classList.remove('sel'); }
      else { selected.add(i); chip.classList.add('sel'); }
      refresh();
    });
  });

  pick.querySelector('#save').addEventListener('click', () => {
    if (selected.size === 0) return;
    const targets = [...selected].sort((a, b) => a - b).map((i) => ({
      gap: { start: starts[i], length: units[i].length },
      grapheme: units[i],
      confusionClass: classForGrapheme(units[i]),
      distractors: distractorsFor(units[i])
    }));
    store.addWord(state, store.newWord({ text, targets }));
    renderMain();
  });
}

// Dev hook για αυτοματοποιημένους ελέγχους — δεν χρησιμοποιείται από το UI.
window.flameParent = { open };
