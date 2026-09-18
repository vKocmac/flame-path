// Το κατάστημα (NEXT-FIXES Ζ11, απόφαση Κοσμά/Σταύρου 11/09):
// «Να αναβαθμίζεται ο παίκτης. Το κατάστημα θα έχει σπαθιά, μια μάσκα που
// ανάλογα ποια, θα μαζεύει πολλαπλάσια φωτάκια… θα επενδύει σε κάποια
// αναβάθμιση με σκοπό να παίρνει περισσότερα στο μέλλον. Η μάσκα αν κάνεις
// λάθη θα φεύγει σιγά σιγά η δύναμή της και θα τη χάνει.»
//
// ΔΕΔΟΜΕΝΑ, όχι κώδικας: τιμές και είδη αλλάζουν ΜΟΝΟ εδώ. Τα ονόματα ζουν
// στο strings.js (TXT.shopItems). Νόμισμα: οι σπίθες — βγαίνουν μόνο από
// σωστές απαντήσεις, άρα ό,τι αγοράζεται περνά από την ορθογραφία.
//
//   sword  — αναβάθμιση με τη σειρά (tier). Κάθε σπαθί κρατά και ό,τι έδιναν
//            τα προηγούμενα:
//              1 ατσάλινο  — χτυπά με σπαθί από πιο μακριά (+80px)
//              2 φλεγόμενο — +2 σπίθες όταν η σπαθιά ρίχνει εχθρό
//              3 κεραυνού  — η κόψη βρίσκει και τον δεύτερο εχθρό
//              4 δράκου    — η σπαθιά χτυπά διπλά
//   mask   — φοριέται ΜΙΑ· πολλαπλασιάζει τις σπίθες· κάθε λάθος σβήνει μία
//            «ζωή» (pips), στο μηδέν ραγίζει και χάνεται. Νέα μάσκα = αντικαθιστά.
//   magnet — επένδυση, για πάντα: +level σπίθες σε κάθε εχθρό
//   ribbon — η κορδέλα στο κεφάλι. Ως τη v3.24 μόνο στολίδι· Κ1 (18/09): «θέλω
//            να δίνει κάτι… σαν άμυνα? ή… περισσότερο περιθώριο χρόνου? Κάθε
//            ζώνη κάτι». Φοριέται μία· το όφελός της: RIBBON_FX.
//   robe   — η στολή (Λ1, 18/09, ιδέα και σχέδιο του Σταύρου: «να έχει γιακά
//            όπως έχει μια ρόμπα νίντζα… να το αγοράζει και να αλλάζει… ίσως
//            να δίνει κάτι»). Ίδιος κανόνας με όπλα: ζώνη ξεκλειδώνει, σπίθες
//            αγοράζουν, φοράει μία. Η «Στολή της Νύχτας» είναι δική του. ROBE_FX.
//            Λ1β (18/09): «να την χάνεις όπως και τη μάσκα… να αγοράζεις στολή
//            όπως τα άλλα» — κάθε πρώτο λάθος λέξης φθείρει μία ζωή (pips)· στο
//            μηδέν σκίζεται και ξαναφορά τη Νύχτας. Ξαναγοράζεται, όποια θέλει.
//   power  — δύναμη της μπάρας (Θ5, 18/09). Την ξεκλειδώνει η ΖΩΝΗ (`belt`),
//            την αγοράζουν οι σπίθες. Μόνο όσες έχει αγοράσει χτυπούν.
//   weapon — το βασικό όπλο (Θ5/Θ6). Ίδιος κανόνας· από όσα έχει, ΔΙΑΛΕΓΕΙ
//            ποιο κρατά (εδώ ή πάνω αριστερά στη μάχη). Η φλόγα είναι δική
//            του από την αρχή. Δύναμη ανά όπλο: βλ. WEAPON_HIT.

export const SHOP = [
  { id: 'power-tornado', cat: 'power', power: 'tornado', price: 40, belt: 0 },
  { id: 'power-clones', cat: 'power', power: 'clones', price: 90, belt: 1 },
  { id: 'power-volcano', cat: 'power', power: 'volcano', price: 160, belt: 3 },
  { id: 'power-dragon', cat: 'power', power: 'dragon', price: 280, belt: 5 },
  { id: 'power-lightning', cat: 'power', power: 'lightning', price: 450, belt: 7 },
  { id: 'robe-night', cat: 'robe', price: 0, belt: 0 },
  { id: 'robe-fire', cat: 'robe', price: 80, belt: 1, pips: 8 },
  { id: 'robe-water', cat: 'robe', price: 100, belt: 2, pips: 8 },
  { id: 'robe-earth', cat: 'robe', price: 120, belt: 3, pips: 7 },
  { id: 'robe-sky', cat: 'robe', price: 150, belt: 4, pips: 6 },
  { id: 'weapon-fire', cat: 'weapon', weapon: 'fire', price: 0, belt: 0 },
  { id: 'weapon-plasma', cat: 'weapon', weapon: 'plasma', price: 120, belt: 2 },
  { id: 'weapon-volt', cat: 'weapon', weapon: 'volt', price: 220, belt: 4 },
  { id: 'weapon-star', cat: 'weapon', weapon: 'star', price: 350, belt: 6 },
  { id: 'sword-steel', cat: 'sword', price: 60, tier: 1 },
  { id: 'sword-fire', cat: 'sword', price: 150, tier: 2 },
  { id: 'sword-storm', cat: 'sword', price: 300, tier: 3 },
  { id: 'sword-dragon', cat: 'sword', price: 600, tier: 4 },
  { id: 'mask-fox', cat: 'mask', price: 40, mult: 2, pips: 5 },
  { id: 'mask-tiger', cat: 'mask', price: 120, mult: 3, pips: 4 },
  { id: 'mask-dragon', cat: 'mask', price: 300, mult: 5, pips: 3 },
  { id: 'magnet-1', cat: 'magnet', price: 80, level: 1 },
  { id: 'magnet-2', cat: 'magnet', price: 200, level: 2 },
  { id: 'magnet-3', cat: 'magnet', price: 400, level: 3 },
  { id: 'ribbon-red', cat: 'ribbon', price: 60, color: 'flameDeep' },
  { id: 'ribbon-spirit', cat: 'ribbon', price: 90, color: 'spirit' },
  { id: 'ribbon-gold', cat: 'ribbon', price: 120, color: 'lantern' },
  { id: 'ribbon-silver', cat: 'ribbon', price: 150, color: 'moon' }
];

export const CATS = ['power', 'weapon', 'robe', 'sword', 'mask', 'magnet', 'ribbon'];

// Λ1: τι δίνει η στολή που φορά
//   bonus    — Φωτιάς: ×1,25 φωτιές στην Πύλη (πίστα μπόνους)
//   asmTime  — Νερού: +4 δευτ. στη Μεγάλη Τεχνική
//   tough    — Βουνού: οι ανθεκτικοί εχθροί έρχονται με μία ζωή λιγότερη
//   keepCombo — Ουρανού: η σειρά σωστών δεν σπάει στο πρώτο λάθος της λέξης
export const ROBE_FX = {
  'robe-fire': { bonus: 1.25 },
  'robe-water': { asmTime: 4000 },
  'robe-earth': { tough: -1 },
  'robe-sky': { keepCombo: true }
};

/** Η στολή που φορά: { id, pips } όσο έχει ζωές· αλλιώς της Νύχτας. */
export function currentRobe(shop) {
  const r = shop && shop.robe;
  return r && typeof r === 'object' && r.pips > 0 ? r.id : 'robe-night';
}

export function robeFx(shop) { return ROBE_FX[currentRobe(shop)] || {}; }

// Πόσο χτυπά κάθε όπλο (Θ5: «η φωτιά… θα σε αναγκάζει να πας να αγοράσεις»):
//   front — ζημιά στον μπροστινό · splash — ζημιά και στον δεύτερο της γραμμής
export const WEAPON_HIT = {
  fire: { front: 1, splash: 0 },
  plasma: { front: 1, splash: 1 },
  volt: { front: 2, splash: 0 },
  star: { front: 2, splash: 1 }
};

// Κ1: τι δίνει η κορδέλα που φορά (μία τη φορά)
//   shield — Ασπίδα: το πρώτο λάθος κάθε κύματος δεν ρίχνει τη μπάρα δύναμης
//   time   — Χρόνος: η μπάρα χρόνου κρατά ×1,5 (και στη Μεγάλη Τεχνική)
//   rage   — Φλόγα: η μπάρα δύναμης γεμίζει ×1,25
//   slow   — Ανάσα: οι εχθροί πλησιάζουν ×0,8
export const RIBBON_FX = {
  'ribbon-red': { shield: true },
  'ribbon-spirit': { time: 1.5 },
  'ribbon-gold': { rage: 1.25 },
  'ribbon-silver': { slow: .8 }
};

/** Το όφελος της κορδέλας που φορά (κενό αν δεν φορά ή δεν την έχει). */
export function ribbonFx(shop) {
  return (shop && shop.ribbon && shop.owned.includes(shop.ribbon) && RIBBON_FX[shop.ribbon]) || {};
}

/** Οι δυνάμεις που έχει αγοράσει, με τη σειρά του καταλόγου. */
export function ownedPowers(shop) {
  return SHOP.filter((x) => x.cat === 'power' && shop.owned.includes(x.id)).map((x) => x.power);
}

/** Τα όπλα που έχει (η φλόγα πάντα). */
export function ownedWeapons(shop) {
  return SHOP.filter((x) => x.cat === 'weapon' && (x.price === 0 || shop.owned.includes(x.id))).map((x) => x.weapon);
}

/** Το όπλο που κρατά — αν το διαλεγμένο δεν υπάρχει (π.χ. νέο προφίλ), η φλόγα. */
export function currentWeapon(shop) {
  const have = ownedWeapons(shop);
  return have.includes(shop.weapon) ? shop.weapon : 'fire';
}

export function item(id) {
  return SHOP.find((x) => x.id === id) || null;
}

/** Το καλύτερο σπαθί που έχει (0 = το ξύλινο της αρχής). */
export function swordTier(shop) {
  return SHOP.filter((x) => x.cat === 'sword' && shop.owned.includes(x.id))
    .reduce((m, x) => Math.max(m, x.tier), 0);
}

/** Η μάσκα που φορά (το είδος του καταλόγου) ή null. */
export function maskItem(shop) {
  return shop.mask ? item(shop.mask.id) : null;
}

/** Πόσες σπίθες δίνει ένας εχθρός που πέφτει: (βάση + μαγνήτης) × μάσκα. */
export function sparkGain(shop, base) {
  const m = maskItem(shop);
  return (base + (shop.magnet || 0)) * (m ? m.mult : 1);
}

/**
 * Μπορεί να το αγοράσει τώρα; 'owned' · 'belt' (θέλει ανώτερη ζώνη) ·
 * 'locked' (θέλει πρώτα το προηγούμενο)
 * · 'poor' (δεν φτάνουν οι σπίθες) · 'ok'. Οι μάσκες ξαναγοράζονται.
 */
export function status(it, shop, sparks, belt = 0) {
  if (it.cat === 'robe') {                          // σαν τη μάσκα: ξαναγοράζεται
    if (it.price === 0 || currentRobe(shop) === it.id) return 'owned';
    if ((it.belt || 0) > belt) return 'belt';
    return sparks >= it.price ? 'ok' : 'poor';
  }
  if (it.cat === 'power' || it.cat === 'weapon') {
    if (it.price === 0 || shop.owned.includes(it.id)) return 'owned';
    if ((it.belt || 0) > belt) return 'belt';           // θέλει πρώτα αυτή τη ζώνη
  }
  if (it.cat === 'sword') {
    if (shop.owned.includes(it.id)) return 'owned';
    if (it.tier > swordTier(shop) + 1) return 'locked';
  }
  if (it.cat === 'magnet') {
    if ((shop.magnet || 0) >= it.level) return 'owned';
    if (it.level > (shop.magnet || 0) + 1) return 'locked';
  }
  if (it.cat === 'ribbon' && shop.owned.includes(it.id)) return 'owned';
  if (it.cat === 'mask' && shop.mask && shop.mask.id === it.id) return 'owned';
  return sparks >= it.price ? 'ok' : 'poor';
}
