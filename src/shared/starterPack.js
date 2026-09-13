// Βασικό πακέτο λέξεων — για όποιον ανοίγει το παιχνίδι πρώτη φορά (13/09).
// Ο ιδιοκτήτης: «να το πάρει ένα παιδί και να μην έχει τριβή ώστε να το
// δοκιμάσει». Χωρίς αυτό, καθαρή συσκευή = «Δεν έχω τεχνικές να σου μάθω».
//
// Λέξεις Γ' Δημοτικού, μικρές, με πραγματικό ορθογραφικό ερώτημα: ι/η/υ,
// ει/οι, ο/ω, ε/αι, αυ/ευ, διαλυτικά, διπλά σύμφωνα. Τα σημεία ελέγχου
// μπαίνουν όπως στη «μαζική προσθήκη» του γονιού (autoTargets), ώστε μια
// λέξη του πακέτου να μη διαφέρει σε τίποτα από μια λέξη που έγραψε εκείνος.
// Όπου το αυτόματο θα διάλεγε λάθος σημείο (π.χ. το «λ» στη «θάλασσα»),
// το `only` λέει ποιο γράφημα ρωτιέται.

import { autoTargets } from './graphemes.js';
import * as store from './storage.js';

const WORDS = [
  // ι / η / υ
  'λιμάνι', 'σπίτι', 'νύχτα', 'κύμα', 'τυρί', 'μήλο', 'νησί', 'ψάρι',
  'κήπος', 'σκύλος', 'μολύβι', 'σύννεφο', 'γυαλί',
  // ει / οι
  'είναι', 'ποιος', 'χειμώνας', 'σχολείο', 'όνειρο',
  // ο / ω
  'ψωμί', 'δώρο', 'φωτιά', 'ωραίος', 'βουνό',
  // ε / αι
  'παιδί', 'καλοκαίρι', 'καινούριο', 'δέντρο', 'νερό',
  // αυ / ευ · διαλυτικά
  'αύριο', 'αυτί', 'ευχή', 'μαϊμού',
  // διπλά σύμφωνα — μόνο το διπλό ρωτιέται
  { text: 'θάλασσα', only: ['σσ'] },
  { text: 'γράμμα', only: ['μμ'] },
  { text: 'φεγγάρι', only: ['γγ'] }
];

export const STARTER_COUNT = WORDS.length;

/** Οι λέξεις του πακέτου, έτοιμες για store.newWord: [{ text, targets }]. */
export function starterWords() {
  return WORDS.map((w) => {
    const { text, only } = typeof w === 'string' ? { text: w } : w;
    return { text, targets: autoTargets(text, only) };
  });
}

/**
 * Προσθέτει στο ενεργό προφίλ όσες λέξεις του πακέτου ΔΕΝ έχει ήδη.
 * Δεν σβήνει και δεν αλλάζει τίποτα. Επιστρέφει πόσες μπήκαν.
 */
export function loadStarterPack(state) {
  if (!store.activeProfile(state)) store.createProfile(state, 'Νίντζα');
  const p = store.activeProfile(state);
  const have = new Set(p.words.map((w) => w.text));
  let added = 0;
  for (const w of starterWords()) {
    if (have.has(w.text) || !w.targets.length) continue;
    p.words.push(store.newWord(w));
    have.add(w.text);
    added++;
  }
  if (added) store.saveState(state);
  return added;
}
