// Parent Mode (Βήμα 1: λειτουργικό, όχι όμορφο).
// Είσοδος: 5 γρήγορα αγγίγματα στη γραμμή κατάστασης → PIN.
// Την πρώτη φορά ο γονιός ΟΡΙΖΕΙ το PIN (αποθηκεύεται μόνο σε αυτή τη συσκευή).

import * as store from '../shared/storage.js';
import { AUTO_CLASSES, canBeGap, splitGraphemes, classForGrapheme, distractorsFor } from '../shared/graphemes.js';
import { errorCounts, hardestTargets, learningFlow } from '../learning/telemetry.js';
import * as journey from '../game/journey.js';

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
  // ΦΡΕΣΚΟ state σε κάθε άνοιγμα. Πριν, το Parent Mode κρατούσε το αντίγραφο
  // της ΦΟΡΤΩΣΗΣ της σελίδας: ό,τι έπαιζε το παιδί στο μεταξύ (σπίθες,
  // επίπεδα) χανόταν μόλις ο γονιός πρόσθετε μια λέξη, γιατί σωζόταν από
  // πάνω το παλιό αντίγραφο.
  state = store.loadState();
  if (!store.activeProfile(state)) store.createProfile(state, 'Νίντζα');
  root.classList.add('open');
  const dev = store.getDevice();
  if (!dev.pin) renderPinSetup();
  else renderPinEntry();
}

// Το κλείσιμο ΑΝΑΝΕΩΝΕΙ τη σελίδα (NEXT-FIXES Ε2). Το παιχνίδι ξεκινά έτσι
// με τις νέες λέξεις και το σωστό προφίλ, και ο καμβάς ξαναμετριέται — στο
// tablet το πληκτρολόγιο άλλαζε το μέγεθος της οθόνης και μετά δεν πατιόταν
// ούτε η φωτιά.
function close() {
  root.classList.remove('open');
  root.innerHTML = '';
  location.reload();
}

function el(html) {
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.firstElementChild;
}

// Τα ονόματα τα γράφει ο γονιός — ποτέ ωμά μέσα σε HTML.
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
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

// Ό,τι σβήνει δεδομένα του παιδιού ζητά ΞΑΝΑ τον κωδικό (NEXT-FIXES Ε6).
// Δεν αρκεί που είσαι ήδη μέσα: το μενού μένει ανοιχτό και το tablet αλλάζει
// χέρια. Το κουμπί γράφει ΤΙ ακριβώς θα γίνει και σε ΠΟΙΟΝ.
function confirmWithPin({ title, body, label, action }) {
  const w = screen(`
    <h2>${esc(title)}</h2>
    <p class="pm-note pm-warn">${body}</p>
    <p class="pm-note">Δεν αναιρείται. Γράψε το PIN για να συνεχίσεις.</p>
    <input class="pm-input" id="pin" inputmode="numeric" maxlength="4" placeholder="••••">
    <p class="pm-error" id="err"></p>
    <div class="pm-row">
      <button class="pm-btn danger" id="ok">${esc(label)}</button>
      <button class="pm-btn" id="cancel">Άκυρο</button>
    </div>`);
  const go = () => {
    if (w.querySelector('#pin').value.trim() !== store.getDevice().pin) {
      w.querySelector('#err').textContent = 'Λάθος PIN.';
      return;
    }
    renderMain(action());
  };
  w.querySelector('#ok').addEventListener('click', go);
  w.querySelector('#pin').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  w.querySelector('#cancel').addEventListener('click', () => renderMain());
  w.querySelector('#pin').focus();
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

function plural(n, one, many) { return `${n} ${n === 1 ? one : many}`; }

function profilesHTML() {
  return state.profiles.map(({ profile, words }) => {
    const active = profile.id === state.activeProfileId;
    return `
    <div class="pm-prof${active ? ' active' : ''}" data-id="${profile.id}">
      <span class="name">${esc(profile.name)}</span>
      <span class="meta">${plural(words.length, 'λέξη', 'λέξεις')} · ${profile.sparks || 0} σπίθες</span>
      ${active
        ? '<span class="pm-badge">▶ παίζει τώρα</span>'
        : '<button class="pm-btn small use">Παίζει αυτό</button>'}
      <button class="ren" aria-label="Μετονομασία">✎</button>
      ${state.profiles.length > 1 ? '<button class="del" aria-label="Διαγραφή προφίλ">🗑</button>' : ''}
    </div>`;
  }).join('');
}

function download(text, name) {
  const blob = new Blob([text], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Αυτόματα σημεία ελέγχου για τη μαζική προσθήκη: ό,τι θα προεπέλεγε και
// η οθόνη της μίας λέξης (φωνήεντα, διαλυτικά). Αν η λέξη δεν έχει κανένα
// τέτοιο (π.χ. «ουρά»), παίρνει ό,τι έχει κλάση — το «ου» ρωτιέται πια στη
// Μεγάλη Τεχνική.
function autoTargets(text) {
  const units = splitGraphemes(text);
  const starts = [];
  let pos = 0;
  units.forEach((u) => { starts.push(pos); pos += u.length; });
  const all = units.map((u, i) => i);
  let idx = all.filter((i) => AUTO_CLASSES.includes(classForGrapheme(units[i])));
  if (!idx.length) idx = all.filter((i) => classForGrapheme(units[i]));
  return idx.map((i) => ({
    gap: { start: starts[i], length: units[i].length },
    grapheme: units[i],
    confusionClass: classForGrapheme(units[i]),
    distractors: distractorsFor(units[i])
  }));
}

// Η πρόοδος με μια ματιά (BUILD_PLAN βήμα 7 — «στοιχειώδης λίστα προόδου»).
function progressHTML(p) {
  const all = p.words.flatMap((w) => w.targets);
  if (!all.length) return '<p class="pm-note">Δεν υπάρχουν λέξεις ακόμα.</p>';
  const mastered = all.filter((t) => t.level >= journey.MASTERY_LEVEL).length;
  const asked = all.filter((t) => t.attempts > 0).length;
  const j = store.getJourney(state);
  const conf = [];
  for (const m of Object.values(errorCounts(p))) {
    for (const [g, n] of Object.entries(m)) conf.push({ g, n });
  }
  conf.sort((a, b) => b.n - a.n);
  const hard = hardestTargets(p, 5).filter((r) => r.failRate > 0);
  const f = learningFlow(p, new Date(), journey.MASTERY_LEVEL);
  return `
    <p class="pm-stat">Λέξεις: <b>${f.mastered}</b> κατακτημένες · <b>${f.learning}</b> μαθαίνει τώρα · <b>${f.waiting}</b> περιμένουν σειρά</p>
    <p class="pm-stat">Για επανάληψη σήμερα: <b>${plural(f.dueToday, 'σημείο', 'σημεία')}</b>${f.recent
      ? ` · νέες των 7 ημερών: <b>${f.recentMastered}</b>/${f.recent} κατακτημένες` : ''}</p>
    <p class="pm-stat"><b>${mastered}</b> από ${all.length} σημεία κατακτημένα · ${asked} έχουν ρωτηθεί</p>
    <p class="pm-stat">Σταθμός <b>${j.station + 1}</b> από ${journey.STATIONS} · ${j.cycle ? `${j.cycle + 1}ος γύρος του Δρόμου` : 'πρώτος γύρος του Δρόμου'} · ${p.profile.sparks || 0} σπίθες</p>
    <p class="pm-note">Γράμματα που διαλέγει λάθος: ${conf.length
      ? conf.slice(0, 8).map((c) => `<b>${esc(c.g)}</b> ×${c.n}`).join(' · ')
      : 'κανένα ακόμα'}</p>
    ${hard.length ? `<p class="pm-note">Δυσκολεύουν: ${hard.map((r) =>
      `${esc(r.word)} (${esc(r.grapheme)}, ${Math.round(r.failRate * 100)}% σε ${r.attempts})`).join(' · ')}</p>` : ''}
    <p class="pm-note">«Κατακτημένο» = σωστό σε δύο διαφορετικές μέρες. Οι κατακτημένες λέξεις ξεκλειδώνουν τεχνικές του νίντζα.</p>
    <p class="pm-note">Οι νέες λέξεις μπαίνουν σιγά σιγά: όσο πολλές είναι ακόμα «μαθαίνει τώρα», οι επόμενες περιμένουν σειρά. Οι κατακτημένες ξανάρχονται μόνες τους σε 3, 7, 14 και 30 μέρες — και ανάμεσα, στην προπόνηση. Καμία δεν αποσύρεται.</p>`;
}

function renderMain(note = '') {
  const p = store.activeProfile(state);
  const name = esc(p.profile.name);
  const words = p.words.map((wd) => `
    <div class="pm-word" data-id="${wd.id}">
      <span class="w">${wordHTML(wd)}</span>
      <span class="meta">${plural(wd.targets.length, 'σημείο', 'σημεία')} · κατακτημένα ${wd.targets.filter((t) => t.level >= journey.MASTERY_LEVEL).length}/${wd.targets.length}</span>
      <button class="del" aria-label="Διαγραφή">🗑</button>
    </div>`).join('') || '<p class="pm-note">Καμία λέξη ακόμα.</p>';

  const w = screen(`
    <button class="pm-btn primary wide" id="done">✓ Αποθήκευση &amp; πίσω στο παιχνίδι</button>
    <p class="pm-ok">${esc(note)}</p>

    <h2>Λέξεις — ${name}</h2>
    <h3>Νέα λέξη</h3>
    <div class="pm-row">
      <input class="pm-input" id="word" placeholder="π.χ. λιμάνι" style="flex:1;min-width:200px">
      <button class="pm-btn primary" id="next">Συνέχεια</button>
    </div>
    <div id="pick"></div>
    <details class="pm-bulk">
      <summary>Πολλές λέξεις μαζί</summary>
      <textarea class="pm-input pm-area" id="bulk" rows="5" placeholder="μία λέξη σε κάθε γραμμή (ή με κόμματα)"></textarea>
      <button class="pm-btn primary" id="bulkadd">Προσθήκη όλων</button>
      <p class="pm-note">Τα σημεία ελέγχου μπαίνουν αυτόματα (φωνήεντα και διαλυτικά). Για διπλά σύμφωνα, πρόσθεσε τη λέξη μόνη της πιο πάνω και διάλεξε το σημείο.</p>
      <p class="pm-note">Βάλε όσες θέλεις — π.χ. τη λίστα της εβδομάδας. Το παιχνίδι τις φέρνει σιγά σιγά (περίπου 6 λέξεις μαθαίνονται μαζί) και συνεχίζει να ρωτά και τις παλιές.</p>
    </details>
    <h3>Λίστα (${p.words.length})</h3>
    <div id="list">${words}</div>

    <h3>Πρόοδος — ${name}</h3>
    <div id="progress">${progressHTML(p)}</div>

    <h3>Προφίλ</h3>
    <p class="pm-note">Κάθε προφίλ έχει δικές του λέξεις, πρόοδο και σπίθες. Για δοκιμές φτιάξε ένα «Δοκιμή» — δεν αγγίζει κανέναν άλλον.</p>
    <div id="profiles">${profilesHTML()}</div>
    <div class="pm-row" style="margin-top:10px">
      <input class="pm-input" id="pname" placeholder="Όνομα νέου προφίλ" style="flex:1;min-width:180px">
      <button class="pm-btn" id="padd">Νέο προφίλ</button>
    </div>
    <label class="pm-check"><input type="checkbox" id="pcopy" checked> με τις λέξεις του «${name}» (χωρίς την πρόοδό του)</label>

    <h3>Μεταφορά σε άλλη συσκευή</h3>
    <div class="pm-row">
      <button class="pm-btn" id="expw">Εξαγωγή: μόνο λέξεις</button>
      <button class="pm-btn" id="expf">Εξαγωγή: λέξεις + πρόοδος</button>
    </div>
    <div class="pm-row" style="margin-top:10px">
      <button class="pm-btn" id="impw">Εισαγωγή: πρόσθεσε λέξεις</button>
      <button class="pm-btn" id="impf">Εισαγωγή: αντικατάσταση όλων</button>
      <input type="file" id="impfile" accept=".json,application/json" style="display:none">
    </div>
    <p class="pm-note"><b>Μόνο λέξεις</b>: το συνηθισμένο — η άλλη συσκευή ξεκινά καθαρά. Η εισαγωγή λέξεων ΠΡΟΣΘΕΤΕΙ στο «${name}» όσες δεν έχει, χωρίς να σβήσει τίποτα.<br>
    <b>Λέξεις + πρόοδος</b>: μόνο όταν μεταφέρεις πραγματικά τον παίκτη. Η αντικατάσταση σβήνει ό,τι υπάρχει σε αυτή τη συσκευή.</p>

    <h3>Επικίνδυνα</h3>
    <div class="pm-row">
      <button class="pm-btn danger" id="reset">Μηδενισμός προόδου: ${name}</button>
      <button class="pm-btn danger" id="wipe">Διαγραφή όλων</button>
    </div>
    <p class="pm-note">Και τα δύο ζητούν ξανά το PIN.</p>
    <p class="pm-error" id="err"></p>`);

  const err = w.querySelector('#err');
  w.querySelector('#done').addEventListener('click', close);

  w.querySelector('#next').addEventListener('click', () => renderPick(w));
  w.querySelector('#word').addEventListener('keydown', (e) => { if (e.key === 'Enter') renderPick(w); });

  // Οι λέξεις της εβδομάδας σε μία κίνηση (BUILD_PLAN βήμα 7: < 2 λεπτά)
  w.querySelector('#bulkadd').addEventListener('click', () => {
    const list = w.querySelector('#bulk').value.split(/[\n,;]+/).map(normalizeWord).filter(Boolean);
    const have = new Set(p.words.map((x) => x.text));
    let added = 0;
    const dup = [], skipped = [];
    for (const text of list) {
      if (text.includes(' ')) { skipped.push(text); continue; }
      if (have.has(text)) { dup.push(text); continue; }
      const targets = autoTargets(text);
      if (!targets.length) { skipped.push(text); continue; }
      store.addWord(state, store.newWord({ text, targets }));
      have.add(text);
      added++;
    }
    let msg = `Μπήκαν ${plural(added, 'λέξη', 'λέξεις')}.`;
    if (dup.length) msg += ` Υπήρχαν ήδη: ${dup.join(', ')}.`;
    if (skipped.length) msg += ` Χωρίς σημείο ελέγχου: ${skipped.join(', ')}.`;
    renderMain(msg);
  });

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

  // --- προφίλ ---
  w.querySelectorAll('.pm-prof').forEach((row) => {
    const id = row.dataset.id;
    const entry = state.profiles.find((x) => x.profile.id === id);
    row.querySelector('.use')?.addEventListener('click', () => {
      store.setActiveProfile(state, id);
      renderMain(`Τώρα παίζει: ${entry.profile.name}`);
    });
    row.querySelector('.ren').addEventListener('click', () => {
      const n = prompt('Νέο όνομα:', entry.profile.name);
      if (n && n.trim()) { store.renameProfile(state, id, n.trim()); renderMain(); }
    });
    row.querySelector('.del')?.addEventListener('click', () => confirmWithPin({
      title: `Διαγραφή προφίλ: ${entry.profile.name}`,
      body: `Σβήνονται ${plural(entry.words.length, 'λέξη', 'λέξεις')}, ${entry.profile.sparks || 0} σπίθες και όλη η πρόοδος του «${esc(entry.profile.name)}». Τα άλλα προφίλ δεν αγγίζονται.`,
      label: `Διαγραφή: ${entry.profile.name}`,
      action: () => {
        store.deleteProfile(state, id);
        return `Διαγράφηκε το «${entry.profile.name}».`;
      }
    }));
  });

  w.querySelector('#padd').addEventListener('click', () => {
    const n = w.querySelector('#pname').value.trim();
    if (!n) { err.textContent = 'Γράψε όνομα για το νέο προφίλ.'; return; }
    if (state.profiles.some((x) => x.profile.name === n)) { err.textContent = `Υπάρχει ήδη προφίλ «${n}».`; return; }
    const copy = w.querySelector('#pcopy').checked ? p.words : [];
    const entry = store.createProfile(state, n, { words: copy });
    store.setActiveProfile(state, entry.profile.id);
    renderMain(`Νέο προφίλ «${n}»${copy.length ? ` με ${plural(copy.length, 'λέξη', 'λέξεις')}` : ''} — παίζει τώρα.`);
  });

  // --- μεταφορά ---
  const day = new Date().toISOString().slice(0, 10);
  w.querySelector('#expw').addEventListener('click', () =>
    download(store.exportJSON(state, { progress: false }), `flame-path-lexeis-${day}.json`));
  w.querySelector('#expf').addEventListener('click', () =>
    download(store.exportJSON(state, { progress: true }), `flame-path-proodos-${day}.json`));

  const impfile = w.querySelector('#impfile');
  let mode = 'words';
  w.querySelector('#impw').addEventListener('click', () => { mode = 'words'; impfile.click(); });
  w.querySelector('#impf').addEventListener('click', () => { mode = 'full'; impfile.click(); });
  impfile.addEventListener('change', () => {
    const f = impfile.files[0];
    impfile.value = '';
    if (!f) return;
    f.text().then((txt) => {
      if (mode === 'words') {
        const n = store.importWords(state, txt);
        renderMain(n ? `Μπήκαν ${plural(n, 'νέα λέξη', 'νέες λέξεις')} στο «${p.profile.name}».` : 'Όλες οι λέξεις του αρχείου υπήρχαν ήδη.');
        return;
      }
      confirmWithPin({
        title: 'Αντικατάσταση όλων',
        body: `Το αρχείο «${esc(f.name)}» θα ΑΝΤΙΚΑΤΑΣΤΗΣΕΙ όλα τα προφίλ, τις λέξεις και την πρόοδο σε αυτή τη συσκευή.`,
        label: 'Αντικατάσταση όλων',
        action: () => {
          state = store.importJSON(txt);
          return 'Η εισαγωγή ολοκληρώθηκε.';
        }
      });
    }).catch((e) => { err.textContent = e.message; });
  });

  // --- επικίνδυνα ---
  w.querySelector('#reset').addEventListener('click', () => confirmWithPin({
    title: `Μηδενισμός προόδου: ${p.profile.name}`,
    body: `Μένουν οι ${plural(p.words.length, 'λέξη', 'λέξεις')}. Σβήνονται ${p.profile.sparks || 0} σπίθες και ό,τι έχει μάθει το παιχνίδι για το «${esc(p.profile.name)}» — ο πάπυρος ξαναπαίζει από την αρχή.`,
    label: `Μηδενισμός προόδου: ${p.profile.name}`,
    action: () => {
      store.resetProgress(state, p.profile.id);
      return `Η πρόοδος του «${p.profile.name}» μηδενίστηκε.`;
    }
  }));

  w.querySelector('#wipe').addEventListener('click', () => confirmWithPin({
    title: 'Διαγραφή όλων',
    body: `Σβήνονται ΟΛΑ τα προφίλ (${state.profiles.map((x) => esc(x.profile.name)).join(', ')}), οι λέξεις και η πρόοδος σε αυτή τη συσκευή. Το PIN μένει.`,
    label: 'Διαγραφή όλων',
    action: () => {
      state = store.eraseAll();
      store.createProfile(state, 'Νίντζα');
      return 'Η συσκευή καθάρισε.';
    }
  }));
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

  // Προεπιλέγονται μόνο τα φωνήεντα και τα διαλυτικά. Τα διπλά σύμφωνα
  // υπάρχουν ως επιλογή αλλά τα διαλέγει ο γονιός — αλλιώς κάθε σύμφωνο
  // κάθε λέξης θα γινόταν στόχος.
  const selected = new Set();
  units.forEach((u, i) => { if (AUTO_CLASSES.includes(classForGrapheme(u))) selected.add(i); });

  const pick = w.querySelector('#pick');
  pick.innerHTML = `
    <p class="pm-note">Επιλεγμένα είναι τα σημεία που θα ελέγχονται — άγγιξε για να αλλάξεις:</p>
    <div class="pm-chips">${units.map((u, i) => `<button class="pm-chip${selected.has(i) ? ' sel' : ''}" data-i="${i}">${u}</button>`).join('')}</div>
    <p class="pm-note" id="suggest"></p>
    <button class="pm-btn primary" id="save">Αποθήκευση λέξης</button>`;

  const refresh = () => {
    const chosen = [...selected].sort((a, b) => a - b);
    const parts = chosen.map((i) => {
      const g = units[i];
      return canBeGap(g)
        ? `${g} → ${[g, ...distractorsFor(g)].join('/')}`
        : `${g} → (Μεγάλη Τεχνική)`;
    });
    // Τίμια ενημέρωση: ένα «ου» δεν έχει εναλλακτικές, άρα δεν γίνεται κενό.
    // Ρωτιέται πια στη Μεγάλη Τεχνική (συναρμολόγηση), απέναντι σε μεγάλους
    // εχθρούς — πιο αραιά από τις λέξεις με κενό.
    const playable = chosen.filter((i) => canBeGap(units[i])).length;
    const warn = chosen.length && !playable
      ? ' Θα ρωτιέται μόνο στη Μεγάλη Τεχνική (συναρμολόγηση), απέναντι σε μεγάλους εχθρούς.'
      : '';
    pick.querySelector('#suggest').textContent = parts.length
      ? `Σημεία ελέγχου: ${parts.join(' · ')}${warn}`
      : 'Κανένα σημείο — διάλεξε τουλάχιστον ένα φωνήεν ή διπλό σύμφωνο.';
    pick.querySelector('#save').disabled = selected.size === 0;
  };
  refresh();

  pick.querySelectorAll('.pm-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const i = Number(chip.dataset.i);
      const g = units[i];
      if (!classForGrapheme(g)) {
        err.textContent = `Το «${g}» δεν ανήκει σε κλάση σύγχυσης: ι/η/υ/ει/οι · ο/ω · ε/αι · ου · διαλυτικά (αυ-αϋ, ευ-εϋ, οι-οϊ, ει-εϊ, αι-αϊ) · διπλά σύμφωνα (λ-λλ, μ-μμ, ν-νν, π-ππ, ρ-ρρ, σ-σσ, τ-ττ, κ-κκ, β-ββ, γγ-γκ).`;
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
    renderMain(`Μπήκε η λέξη «${text}».`);
  });
}

// Dev hook για αυτοματοποιημένους ελέγχους — δεν χρησιμοποιείται από το UI.
window.flameParent = { open };
