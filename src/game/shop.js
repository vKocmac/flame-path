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
//   ribbon — στολίδι: το χρώμα της κορδέλας στο κεφάλι

export const SHOP = [
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
  { id: 'ribbon-red', cat: 'ribbon', price: 30, color: 'flameDeep' },
  { id: 'ribbon-spirit', cat: 'ribbon', price: 30, color: 'spirit' },
  { id: 'ribbon-gold', cat: 'ribbon', price: 30, color: 'lantern' },
  { id: 'ribbon-silver', cat: 'ribbon', price: 30, color: 'moon' }
];

export const CATS = ['sword', 'mask', 'magnet', 'ribbon'];

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
 * Μπορεί να το αγοράσει τώρα; 'owned' · 'locked' (θέλει πρώτα το προηγούμενο)
 * · 'poor' (δεν φτάνουν οι σπίθες) · 'ok'. Οι μάσκες ξαναγοράζονται.
 */
export function status(it, shop, sparks) {
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
