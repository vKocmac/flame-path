// Οι εχθροί ορίζονται ως ΔΕΔΟΜΕΝΑ, όχι ως κώδικας.
//
// Κανόνας (BRANCH-SCOPE, «Πίνακας αρχετύπων»): ο επόμενος εχθρός πρέπει να
// είναι μία γραμμή σε αυτόν τον πίνακα — ποτέ νέα κλάση, ποτέ αντιγραμμένη
// συνάρτηση σχεδίασης. Ό,τι διαφοροποιεί έναν εχθρό ζει εδώ.
//
//   hp     πόσες ΣΩΣΤΕΣ απαντήσεις χρειάζεται για να πέσει
//   speed  px ανά δευτερόλεπτο προς τον νίντζα. Αργά επίτηδες: στα 18 px/δευτ.
//          ο μπροστινός θέλει ~33 δευτερόλεπτα για να φτάσει, οπότε ένα παιδί
//          που διαβάζει προσεκτικά δεν κινδυνεύει ποτέ. Η πίεση υπάρχει για
//          να δίνει ένταση, όχι για να τιμωρεί την αργή σκέψη.
//   size   κλίμακα σχεδίασης
//   draw   ποια συνάρτηση σχεδίασης της σκηνής χρησιμοποιεί

/** @typedef {{id:string,name:string,hp:number,speed:number,size:number,draw:string}} Archetype */

/** @type {Object<string, Archetype>} */
export const ARCHETYPES = {
  smoke: {
    id: 'smoke',
    name: 'Καπνοδαίμονας',
    hp: 1,
    speed: 18,
    size: 1,
    draw: 'smoke'
  },
  dragon: {
    id: 'dragon',
    name: 'Δράκος',
    hp: 3,          // τρεις ΣΩΣΤΕΣ απαντήσεις — γι' αυτό είναι αφεντικό
    speed: 11,      // αργός και βαρύς
    size: 1.05,
    draw: 'dragon'
  }
  // Επόμενη γραμμή, όταν ο Μάστερ Γου γίνει και χτυπήσιμος (branch του Rage):
  // master: { hp: 5, speed: 14, draw: 'master' }. Τώρα είναι παρουσία, όχι στόχος.
};

// Ο δράκος αλλάζει χρώμα ανά στάδιο — ΠΟΤΕ ροζ/φούξια, μόνο από την
// εγκεκριμένη παλέτα (DESIGN.md). Η φλόγα του παίρνει το ίδιο χρώμα, ώστε
// η αλλαγή σταδίου να γίνεται αντιληπτή μέσα σε ένα δευτερόλεπτο.
export const DRAGON_STAGES = [
  { name: 'πορτοκαλί', body: 'flame',     fire: 'flameCore' },
  { name: 'σμαραγδί',  body: 'spirit',    fire: 'parchment' },
  { name: 'πυρρό',     body: 'flameDeep', fire: 'flame' },
  { name: 'χρυσό',     body: 'lantern',   fire: 'flameCore' }
];

/**
 * Το στάδιο του δράκου για το τρέχον κύμα (κυκλικά).
 * @param {number} wave 1-based
 */
export function dragonStage(wave) {
  return DRAGON_STAGES[(Math.max(1, wave) - 1) % DRAGON_STAGES.length];
}

/**
 * Η σύνθεση ενός κύματος. Ο δράκος μπαίνει ΤΕΛΕΥΤΑΙΟΣ στη σειρά, δηλαδή
 * πιο μακριά: οι καπνοδαίμονες πέφτουν πρώτοι και ο δράκος φτάνει ως το
 * φινάλε του κύματος.
 * Τρεις μορφές το πολύ: με ENEMY_GAP 118 και SPAWN_X 1000 ο τελευταίος
 * κάθεται στο 1236 — μέσα στο κάδρο των 1280.
 * @param {number} wave 1-based
 * @returns {string[]} αρχέτυπα από μπροστά προς τα πίσω
 */
export function waveComposition(wave) {
  return wave % 2 === 0
    ? ['smoke', 'dragon', 'dragon']   // ζυγά κύματα: βαρύτερα
    : ['smoke', 'smoke', 'dragon'];
}

/**
 * @param {string} id
 * @returns {Archetype}
 */
export function archetype(id) {
  return ARCHETYPES[id] || ARCHETYPES.smoke;
}
