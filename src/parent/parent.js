// Parent Mode (Βήμα 1: λειτουργικό, όχι όμορφο).
// Είσοδος: 5 γρήγορα αγγίγματα στη γραμμή κατάστασης → PIN.
// Την πρώτη φορά ο γονιός ΟΡΙΖΕΙ το PIN (αποθηκεύεται μόνο σε αυτή τη συσκευή).

import * as store from '../shared/storage.js';
import { splitGraphemes, classForGrapheme, distractorsFor } from '../shared/graphemes.js';

const root = document.getElementById('parent-root');
let state = store.loadState();
if (!store.activeProfile(state)) store.createProfile(state, 'Νίντζα');

// --- Κρυφή είσοδος: 5 αγγίγματα στο #status μέσα σε 2" ---
let taps = [];
document.getElementById('status').addEventListener('click', () => {
  const t = Date.now();
  taps = taps.filter((x) => t - x < 2000);
  taps.push(t);
  if (taps.length >= 5) { taps = []; open(); }
});

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

function renderMain() {
  const p = store.activeProfile(state);
  const words = p.words.map((wd) => {
    const before = wd.text.slice(0, wd.gap.start);
    const target = wd.text.substr(wd.gap.start, wd.gap.length);
    const after = wd.text.slice(wd.gap.start + wd.gap.length);
    return `<div class="pm-word" data-id="${wd.id}">
      <span class="w">${before}<b>${target}</b>${after}</span>
      <span class="meta">επ. ${wd.level}</span>
      <button class="del" aria-label="Διαγραφή">🗑</button>
    </div>`;
  }).join('') || '<p class="pm-note">Καμία λέξη ακόμα.</p>';

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

// Επιλογή γραφήματος-στόχου: η λέξη τεμαχίζεται σε γραφήματα (δίψηφα ενωμένα)
// και ο γονιός αγγίζει αυτό που δυσκολεύει το παιδί.
function renderPick(w) {
  const text = w.querySelector('#word').value.trim();
  const err = w.querySelector('#err');
  err.textContent = '';
  if (!text || text.includes(' ')) { err.textContent = 'Γράψε μία λέξη, χωρίς κενά.'; return; }

  const units = splitGraphemes(text);
  let starts = [], pos = 0;
  units.forEach((u) => { starts.push(pos); pos += u.length; });

  const pick = w.querySelector('#pick');
  pick.innerHTML = `
    <p class="pm-note">Άγγιξε το σημείο που θέλεις να μάθει:</p>
    <div class="pm-chips">${units.map((u, i) => `<button class="pm-chip" data-i="${i}">${u}</button>`).join('')}</div>
    <p class="pm-note" id="suggest"></p>
    <button class="pm-btn primary" id="save" disabled>Αποθήκευση λέξης</button>`;

  let sel = null;
  pick.querySelectorAll('.pm-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      pick.querySelectorAll('.pm-chip').forEach((c) => c.classList.remove('sel'));
      chip.classList.add('sel');
      const i = Number(chip.dataset.i);
      const g = units[i];
      const cls = classForGrapheme(g);
      const suggest = pick.querySelector('#suggest');
      const save = pick.querySelector('#save');
      if (!cls) {
        sel = null;
        suggest.textContent = `Το «${g}» δεν ανήκει σε κλάση σύγχυσης της Φάσης 1 — διάλεξε φωνήεν (ι/η/υ/ει/οι, ο/ω, ε/αι, ου).`;
        save.disabled = true;
      } else {
        sel = { i, g, cls };
        const d = distractorsFor(g);
        suggest.textContent = d.length
          ? `Πιθανή σύγχυση: ${[g, ...d].join(' / ')}`
          : `Το «${g}» δεν έχει εναλλακτικές — η λέξη θα παίζει μόνο σε συναρμολόγηση.`;
        save.disabled = false;
      }
    });
  });

  pick.querySelector('#save').addEventListener('click', () => {
    if (!sel) return;
    store.addWord(state, store.newWord({
      text,
      gap: { start: starts[sel.i], length: sel.g.length },
      targetGrapheme: sel.g,
      confusionClass: sel.cls,
      distractors: distractorsFor(sel.g)
    }));
    renderMain();
  });
}

// Dev hook για αυτοματοποιημένους ελέγχους — δεν χρησιμοποιείται από το UI.
window.flameParent = { open };
