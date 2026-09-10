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
// ορθογραφία, ποτέ με σπίθες (SPEC κεφ. 7).
//   tornado   — παρασύρει: όλοι πίσω στη γραμμή εκκίνησης + 1 χτύπημα
//   lightning — χτυπά ΟΛΟΥΣ δύο φορές
//   ice       — παγώνει όλους για λίγα δευτερόλεπτα + 1 χτύπημα
export const POWERS = [
  { id: 'tornado', at: 0 },
  { id: 'lightning', at: 2 },
  { id: 'ice', at: 4 }
];

/** Οι δυνάμεις που έχει ο νίντζα σε αυτό το σημείο του Δρόμου. */
export function unlockedPowers(station, cycle) {
  return POWERS.filter((p) => cycle > 0 || station >= p.at).map((p) => p.id);
}

/** Η δύναμη που ξεκλειδώνει ΑΚΡΙΒΩΣ φτάνοντας σε αυτόν τον σταθμό, αν υπάρχει. */
export function powerUnlockedAt(station, cycle) {
  if (cycle > 0) return null;
  const p = POWERS.find((x) => x.at === station && x.at > 0);
  return p ? p.id : null;
}

// Η ζώνη του νίντζα: ένα χρώμα ανά ολοκληρωμένο Δρόμο. Μόνο από την
// εγκεκριμένη παλέτα (DESIGN.md).
export const BELTS = ['lantern', 'flame', 'flameDeep', 'spirit', 'moon'];

export function beltIndex(cycle) {
  return Math.min(cycle, BELTS.length - 1);
}

export function beltColor(cycle) {
  return NUM[BELTS[beltIndex(cycle)]];
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
