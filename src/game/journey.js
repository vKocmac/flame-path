// Ο Δρόμος της Φλόγας (NEXT-FIXES Ε3) — η δομή της προόδου.
// Καθαρά δεδομένα και συναρτήσεις. Τα ΟΝΟΜΑΤΑ (σταθμοί, δυνάμεις, ζώνες)
// ζουν στο strings.js, στο στρώμα θέματος· εδώ μόνο αριθμοί και κανόνες.
//
// Πηγές: HYPER-NOTE §8 (Rage, δυνάμεις με ΔΙΑΦΟΡΕΤΙΚΟ αποτέλεσμα, που
// ξεκλειδώνουν μέσω checkpoints), §9 (μόνιμα checkpoints), §15.1 (Path of
// Letters), PROJECT_SPEC κεφ. 7 (μόνιμη, ορατή ενδυνάμωση — όχι από νόμισμα).

import { NUM } from '../theme/palette.js';
import { BOSS_EVERY } from './enemies.js';

// Επτά σταθμοί· ο τελευταίος είναι το κάστρο του Μάστερ Γου.
export const STATIONS = 7;

// Δυνάμεις της μπάρας. Ξεκλειδώνουν με τη ΝΙΚΗ σε σταθμούς — δηλαδή με
// ορθογραφία, ποτέ με σπίθες (SPEC κεφ. 7). Από την πιο απλή στην πιο δυνατή
// (Γύρος 5, 11/09: ο πάγος έφυγε — «δευτεράζει»· «και τα τρία τα θέλει»):
//   tornado   — ο νίντζα μέσα σε δίνη περνά από όλους: 1 χτύπημα + πίσω
//   clones    — τρεις σκιώδεις κλώνοι κόβουν: 1 χτύπημα + πίσω
//   volcano   — λάβα κάτω από τον καθένα: 1 χτύπημα + ζαλίζονται (ακίνητοι)
//   dragon    — ο Δράκος της Φλόγας βουτά μέσα τους: 2 χτυπήματα
//   lightning — κεραυνοί από το σπαθί: 2 χτυπήματα + ηλεκτρισμένοι (ακίνητοι)
export const POWERS = [
  { id: 'tornado', at: 0 },
  { id: 'clones', at: 1 },
  { id: 'volcano', at: 2 },
  { id: 'dragon', at: 4 },
  { id: 'lightning', at: 5 }
];

// Ως τη v3.23 οι δυνάμεις ξεκλείδωναν ΜΟΝΕΣ τους με τους σταθμούς και το
// όπλο άλλαζε ΜΟΝΟ του με κάθε γύρο του Δρόμου. Γύρος 6 (Θ5/Θ6, 18/09): «δεν
// θέλει να του δίνεις εσύ από μόνο του… τις αγοράζουμε στο marketplace…
// αφού πάτησα αυτό το milestone μου ξεκλειδώνει και εκείνο το όπλο, το οποίο
// όμως θέλει και λεφτά». Τώρα: η ΖΩΝΗ ξεκλειδώνει, οι ΣΠΙΘΕΣ αγοράζουν
// (shop.js), και ο παίκτης ΔΙΑΛΕΓΕΙ όπλο και δύναμη.

// Η ζώνη (Θ2, 18/09): «να ξεκινάει με τις ζώνες κανονικά… του καράτε να
// φτάσει στη μαύρη… μετά… χρυσή, σμαραγδένια… πιο μαγικό». Ως τη v3.23 ήταν
// 5 ζώνες, μία ανά ΟΛΟΚΛΗΡΟ Δρόμο (7 σταθμοί), και μετά η ίδια για πάντα —
// «σμαραγδένια συνέχεια». Τώρα ανεβαίνει με τις ΛΕΞΕΙΣ ΠΟΥ ΕΜΑΘΕ (όλα τα
// σημεία κατακτημένα, και οι αρχειοθετημένες μετράνε) και δεν πέφτει ποτέ.
// Τα χρώματα των ζωνών καράτε δεν υπάρχουν στην παλέτα του DESIGN — εξαίρεση
// με απόφαση ιδιοκτήτη. `edge`: περίγραμμα για τις σκούρες ζώνες.
export const BELTS = [
  { need: 0, color: 0xF2EFE6 },                    // Λευκή
  { need: 3, color: 0xF4CE3A },                    // Κίτρινη
  { need: 6, color: 0xF28C28 },                    // Πορτοκαλί
  { need: 10, color: 0x3FAE55 },                   // Πράσινη
  { need: 15, color: 0x3378E0 },                   // Μπλε
  { need: 21, color: 0x8453D1 },                   // Μωβ
  { need: 28, color: 0x8A5632, edge: 0xC9955F },   // Καφέ
  { need: 36, color: 0x18181C, edge: 0xE0B84A },   // Μαύρη
  { need: 46, color: 0xF1C232, magic: true },      // Χρυσή
  { need: 58, color: 0x1ED3A0, magic: true },      // Σμαραγδένια
  { need: 72, color: 0xE0305E, magic: true },      // Ρουμπινένια
  { need: 88, color: 0x4F8BFF, magic: true },      // Ζαφειρένια
  { need: 106, color: 0xC8F4FF, magic: true },     // Διαμαντένια
  { need: 126, color: 0xFF7A1A, magic: true }      // Ζώνη της Φωτιάς
];

/** Λέξεις που έμαθε: ΟΛΑ τα σημεία κατακτημένα. Και οι αρχειοθετημένες. */
export function learnedWords(profileEntry) {
  if (!profileEntry) return 0;
  return profileEntry.words.filter((w) => w.targets.length
    && w.targets.every((t) => t.level >= MASTERY_LEVEL)).length;
}

export function beltForWords(n) {
  let i = 0;
  while (i + 1 < BELTS.length && n >= BELTS[i + 1].need) i++;
  return i;
}

/** Η ζώνη του προφίλ — ποτέ πιο κάτω από όση έχει ήδη φορέσει (beltMax). */
export function beltOf(profileEntry) {
  const j = (profileEntry && profileEntry.profile.journey) || {};
  return Math.max(j.beltMax || 0, beltForWords(learnedWords(profileEntry)));
}

export function beltColor(i) { return BELTS[Math.max(0, Math.min(i, BELTS.length - 1))].color; }
export function beltEdge(i) { return BELTS[Math.max(0, Math.min(i, BELTS.length - 1))].edge || null; }

/** Πόσες λέξεις λείπουν για την επόμενη ζώνη (null στην τελευταία). */
export function toNextBelt(profileEntry) {
  const i = beltOf(profileEntry);
  if (i + 1 >= BELTS.length) return null;
  return { next: i + 1, need: BELTS[i + 1].need, have: learnedWords(profileEntry) };
}

// Το βασικό όπλο (Ζ10): φλόγα · πλάσμα · ηλεκτρισμός · αστέρι. Από τη v3.24
// το ΔΙΑΛΕΓΕΙ ο παίκτης ανάμεσα σε όσα αγόρασε (shop.js).
export const WEAPONS = ['fire', 'plasma', 'volt', 'star'];

// Η ζώνη δίνει κάτι και ΜΕΣΑ στη μάχη: η μπάρα ξεκινά λίγο πιο γεμάτη.
export const BELT_RAGE = 4;
export function beltRage(belt) {
  return Math.min(40, belt * BELT_RAGE);
}

// Τεχνικές (BUILD_PLAN βήμα 6, PROJECT_SPEC κεφ. 7): ξεκλειδώνουν όταν οι
// λέξεις ΚΑΤΑΚΤΙΟΥΝΤΑΙ — όχι με σπίθες και όχι με σταθμούς. Κατακτημένο
// σημείο = απαντήθηκε σωστά σε δύο διαφορετικές μέρες (επίπεδο Leitner ≥ 2).
// Κάθε τεχνική ΦΑΙΝΕΤΑΙ και ΑΛΛΑΖΕΙ τη μάχη:
//   swift — Γρήγορη Φόρτιση: η φλόγα φεύγει σχεδόν αμέσως
//   blaze — Μεγάλη Φλόγα: μεγαλύτερη, φωτεινότερη βολή
//   twin  — Δίδυμη Φλόγα: δεύτερη βολή χτυπά και τον επόμενο εχθρό
//   ember — Φλογερή Καρδιά: η μπάρα δύναμης ξεκινά μισογεμάτη
export const MASTERY_LEVEL = 2;
export const PERKS = [
  { id: 'swift', need: 2 },
  { id: 'blaze', need: 5 },
  { id: 'twin', need: 10 },
  { id: 'ember', need: 16 }
];

/** Πόσα σημεία ελέγχου έχει κατακτήσει το προφίλ. */
export function masteredCount(profileEntry) {
  if (!profileEntry) return 0;
  let n = 0;
  for (const w of profileEntry.words) {
    for (const t of w.targets) if (t.level >= MASTERY_LEVEL) n++;
  }
  return n;
}

export function unlockedPerks(mastered) {
  return PERKS.filter((p) => mastered >= p.need).map((p) => p.id);
}

export function isFinal(station) {
  return station === STATIONS - 1;
}

/** Στο κάστρο του ο Μάστερ Γου αντέχει περισσότερο. */
export function bossHp(station) {
  return isFinal(station) ? 8 : 5;
}

/**
 * Ο αριθμός κύματος που βλέπει ο πίνακας των κυμάτων (enemies.js). Προχωρά
 * με τον σταθμό και τον κύκλο: κάθε σταθμός λίγο πιο δύσκολος, και ο
 * δεύτερος γύρος του Δρόμου ξεκινά από εκεί που τελείωσε ο πρώτος.
 * @param {number} localWave 1-based μέσα στο λεβελ
 */
export function difficultyWave(station, cycle, localWave) {
  return (cycle * STATIONS + station) * BOSS_EVERY + localWave;
}
