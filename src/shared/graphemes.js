// Ορθογραφικές κλάσεις σύγχυσης — ΔΕΔΟΜΕΝΑ, όχι phonological engine
// (PROJECT_SPEC κεφ. 4). Φάση 1: μόνο οι τέσσερις πρώτες κλάσεις.

export const CONFUSION_CLASSES = {
  i: ['ι', 'η', 'υ', 'ει', 'οι'],
  o: ['ο', 'ω'],
  e: ['ε', 'αι'],
  u: ['ου'] // μόνο του — λέξεις με «ου» παίζουν σε συναρμολόγηση, όχι σε κενό
};

// Δίψηφα που μένουν ενωμένα στον τεμαχισμό (με και χωρίς τόνο).
// Τα αυ/ευ είναι κλάση Φάσης 3, αλλά ο τεμαχισμός τα σέβεται από τώρα.
const DIGRAPHS = [
  'ει', 'εί', 'οι', 'οί', 'ου', 'ού', 'αι', 'αί',
  'αυ', 'αύ', 'ευ', 'εύ'
];

// Τονισμένο ↔ άτονο (ο τόνος είναι εκτός scope ως άσκηση,
// αλλά τα distractors πρέπει να κληρονομούν τον τόνο του στόχου).
const ACCENT = { 'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω' };
const ACCENT_REV = { 'α': 'ά', 'ε': 'έ', 'η': 'ή', 'ι': 'ί', 'ο': 'ό', 'υ': 'ύ', 'ω': 'ώ' };

export function stripAccent(g) {
  return [...g].map((c) => ACCENT[c] || c).join('');
}

function hasAccent(g) {
  return [...g].some((c) => c in ACCENT);
}

// Βάζει τόνο σε γράφημα: σε δίψηφο, στο δεύτερο γράμμα (εί, οί, ού, αί).
function addAccent(g) {
  const chars = [...g];
  const i = chars.length - 1;
  if (ACCENT_REV[chars[i]]) chars[i] = ACCENT_REV[chars[i]];
  return chars.join('');
}

// Τεμαχισμός λέξης σε γραφήματα (greedy, δίψηφα πρώτα).
export function splitGraphemes(text) {
  const units = [];
  let i = 0;
  while (i < text.length) {
    const two = text.substr(i, 2);
    if (DIGRAPHS.includes(two)) { units.push(two); i += 2; }
    else { units.push(text[i]); i += 1; }
  }
  return units;
}

// Κλάση σύγχυσης για γράφημα (αγνοώντας τόνο) — null αν δεν ανήκει σε καμία.
export function classForGrapheme(g) {
  const plain = stripAccent(g);
  for (const [name, members] of Object.entries(CONFUSION_CLASSES)) {
    if (members.includes(plain)) return name;
  }
  return null;
}

// Distractors: τα υπόλοιπα μέλη της κλάσης, με τον τόνο του στόχου.
export function distractorsFor(g) {
  const cls = classForGrapheme(g);
  if (!cls) return [];
  const plain = stripAccent(g);
  const accented = hasAccent(g);
  return CONFUSION_CLASSES[cls]
    .filter((m) => m !== plain)
    .map((m) => (accented ? addAccent(m) : m));
}
