# ARCHITECTURE.md — Ο Δρόμος της Φλόγας

> Τεχνικά θεμέλια · 30/08/2026
> Κάθε session υλοποίησης διαβάζει πρώτα αυτό. Αλλαγές εδώ μόνο με έγκριση ιδιοκτήτη.

## 1. Στοίβα — και γιατί ΔΕΝ έχει build step

- **PWA**: στατικά αρχεία, manifest, service worker. Εγκαθίσταται σε
  tablet/κινητό, δουλεύει πλήρως offline.
- **Phaser 3** για τη σκηνή της μάχης — **vendored** (τοπικό αρχείο στο
  `/vendor`, όχι CDN), ώστε το offline να είναι πραγματικό.
- **Vanilla JS με ES modules** για όλα τα υπόλοιπα (Parent Mode, μενού,
  Learning Engine). Τύποι με **JSDoc σχόλια**, όχι TypeScript.
- **Κανένας bundler, κανένα npm build.** Ό,τι υπάρχει στον φάκελο είναι ό,τι
  τρέχει. Λόγοι: (α) ο ιδιοκτήτης δεν είναι προγραμματιστής — μηδέν εργαλεία
  που μπορούν να «σπάσουν»· (β) οποιοδήποτε AI session συνεχίζει χωρίς setup·
  (γ) το GitHub Pages σερβίρει τα αρχεία ως έχουν.
- **Γραμματοσειρές self-hosted** στο `/assets/fonts` (Andika, Comfortaa) —
  όχι Google Fonts CDN, για offline.

## 2. Τα τρία στρώματα — κανόνας εξαρτήσεων

```
[ Theme (θέμα) ]  →  γνωρίζει τα πάντα για νίντζα/φλόγες. Κανείς δεν γνωρίζει αυτό.
[ Game Engine  ]  →  γνωρίζει σκηνές/κύματα/input. Μιλά στο Learning ΜΟΝΟ μέσω του συμβολαίου §4.
[ Learning Engine ] →  γνωρίζει λέξεις/Leitner/telemetry. ΔΕΝ γνωρίζει τίποτα για το παιχνίδι.
```

- Το Learning Engine δεν κάνει import τίποτα από `/src/game` ή `/src/theme`.
- Το Game Engine δεν διαβάζει ποτέ απευθείας το storage των λέξεων.
- Το Theme είναι δεδομένα + assets: ονόματα, κείμενα, χρώματα, sprites, ήχοι.
  Αλλαγή κόσμου (π.χ. διάστημα) = αλλαγή στο `/src/theme` και `/assets`, μηδέν
  αλλαγή σε `/src/game` και `/src/learning`.

## 3. Δομή φακέλων

```
flame-path/
├── index.html            ← κέλυφος PWA (μενού, ντότζο, ρίζα Phaser)
├── manifest.webmanifest
├── sw.js                 ← service worker (offline cache)
├── serve.ps1             ← τοπικός server για δοκιμή (Βήμα 0)
├── vendor/               ← phaser.min.js (vendored, καρφωμένη έκδοση)
├── assets/               ← fonts/ · img/ · sfx/
├── config/
│   └── learning.json     ← ΟΛΕΣ οι παράμετροι Leitner (§6)
└── src/
    ├── learning/         ← engine.js · scheduler.js · telemetry.js
    ├── game/             ← σκηνές Phaser, κύματα, input router
    ├── theme/            ← strings.js · palette.js · αντιστοιχίσεις assets
    ├── parent/           ← Parent Mode (DOM, όχι Phaser): quick-add, paste,
    │                        export/import, PIN
    └── shared/           ← storage.js · graphemes.js · ids.js
```

## 4. Το Συμβόλαιο (Learning ↔ Game) — η καρδιά της αρχιτεκτονικής

Δύο κλήσεις. Τίποτα άλλο δεν περνά το σύνορο.

```js
// Το Game ζητά την επόμενη πρόκληση:
const ch = learning.getNextChallenge(profileId, { types: ['gap', 'assembly'] });
// Challenge:
// {
//   challengeId,            // μοναδικό ανά εμφάνιση
//   wordId,
//   targetId,               // ποιος στόχος (σημείο ελέγχου) της λέξης παίζει
//   type: 'gap' | 'assembly' | 'intro',
//   text: 'λιμάνι',          // πάντα η ΣΩΣΤΗ πλήρης μορφή
//   gap: { start: 1, length: 1 },     // το κενό ΤΟΥ στόχου (gap/intro)
//   candidates: ['ι','η','υ','ει','οι'], // gap: σωστό+distractors, ανακατεμένα
//   pieces: ['λ','ι','μ','ά','ν','ι'],  // assembly: ΜΟΝΟ γνήσια γραφήματα, ανακατεμένα
//   isPractice: bool         // true = «προπόνηση», δεν επηρεάζει σχεδιασμό
// }
// type 'intro' = τελετή περγαμηνής (πρώτη έκθεση, χωρίς δυνατότητα λάθους).

// Το Game αναφέρει το αποτέλεσμα — ΜΙΑ φορά ανά challenge:
learning.reportResult({
  challengeId, wordId, targetId, profileId,
  type,                    // 'gap' | 'assembly' | 'intro'
  correct,                 // αποτέλεσμα της ΠΡΩΤΗΣ προσπάθειας μόνο
  chosenGrapheme,          // το λάθος γράφημα που διάλεξε (null αν σωστό/intro)
  revealUsed,              // true αν χρειάστηκε αποκάλυψη σωστού
  durationMs,
  at                       // ISO timestamp
});
```

**Κανόνες συμβολαίου:**
- Η επανάληψη μετά την αποκάλυψη του σωστού ΔΕΝ αναφέρεται ως δεύτερο
  αποτέλεσμα — είναι αντιγραφή, όχι ανάκληση.
- Το Game δεν ξέρει γιατί ήρθε μια λέξη· το Learning δεν ξέρει τι απέγινε
  οπτικά. Ο μηχανισμός μάχης είναι αναλώσιμη υπόθεση προς δοκιμή.
- **Δυσκολία**: ρυθμίζεται ΜΟΝΟ από το Learning (επίπεδο λέξεων), ποτέ από
  αριθμό/ταχύτητα εχθρών. Τα δύο ρυθμιστικά είναι ανεξάρτητα.

## 5. Μοντέλο δεδομένων

### Λέξη με πολλαπλούς στόχους (SPEC κεφ. 6 + απόφαση 30/08, schema v2)

Μία λέξη έχει **λίστα στόχων** — ένα σημείο ελέγχου ανά «δύσκολο» γράφημα
(π.χ. «ωδείο»: ω + ει + ο, «λιμάνι»: και τα δύο ι). **Η μονάδα που
προγραμματίζει το Leitner είναι ο στόχος, όχι η λέξη**: κάθε στόχος έχει
δικό του επίπεδο, ιστορικό και nextDueAt, γιατί το παιδί μπορεί να ξέρει
το ένα σημείο και όχι το άλλο.

```js
// Word:
// {
//   id,                    // crypto.randomUUID(), σταθερό για πάντα
//   text: 'λιμάνι',        // πάντα πεζά (το Parent Mode κανονικοποιεί)
//   targets: [Target, ...],
//   sentence: null,        // προαιρετικό παράδειγμα (Φάση 2 χρήση)
//   audioWord: null,       // πεδία από τώρα, υλοποίηση Φάση 2
//   audioSentence: null,
//   addedAt, updatedAt     // ISO timestamps
// }
// Target (σημείο ελέγχου):
// {
//   id,
//   gap: { start: 1, length: 1 },   // εύρος: υποστηρίζει διψήφια ('ει' = length 2)
//   grapheme: 'ι',
//   confusionClass: 'i',   // κλειδί στον πίνακα κλάσεων (graphemes.js)
//   distractors: ['η','υ','ει','οι'],
//   level: 0,              // Leitner 0–5
//   attempts: 0, successes: 0,
//   errorHistory: [],      // [{ grapheme:'η', type:'gap', at }] — ΠΟΤΕ δεν κλαδεύεται
//   challengeTypesUsed: [],// ιστορικό τύπων, για εναλλαγή τρόπου ανάκλησης
//   lastSeenAt: null,
//   nextDueAt: null,
//   introduced: false      // true μετά την τελετή περγαμηνής
// }
```

Κανόνες scheduler (δεσμεύουν το Βήμα 2):
- Δύο στόχοι της ίδιας λέξης δεν εμφανίζονται ποτέ συνεχόμενα στο ίδιο session.
- Η τελετή περγαμηνής (intro) γίνεται μία φορά ανά στόχο, με το δικό του
  γράφημα τονισμένο.
- Στη συναρμολόγηση (χτίζεται όλη η λέξη) το αποτέλεσμα πιστώνεται στον
  στόχο για τον οποίο προγραμματίστηκε η πρόκληση.
- Migration v1→v2 αυτόματο στο storage.js (load και import δέχονται και τα δύο).

### Προφίλ & co-op ετοιμότητα (κόστος ~μηδέν, μπαίνουν από τώρα)

- Η πρόοδος δένεται σε **profileId** (`profiles` λίστα στο storage), όχι στη
  συνεδρία. v1: ένα προφίλ.
- Η κατάσταση μάχης κρατά **λίστα οντοτήτων** (`entities[]`), όχι μεταβλητή
  «ο ήρωας».
- Όλο το input περνά από έναν **input router** που σφραγίζει `playerId`
  (v1: πάντα `'p1'`).

### Κλάσεις σύγχυσης (δεδομένα, όχι κώδικας — `shared/graphemes.js`)

Φάση 1: `/i/` ι η υ ει οι · `/o/` ο ω · `/e/` ε αι · `/u/` ου.
Ο ίδιος πίνακας δίνει και τον τεμαχισμό λέξης σε γραφήματα για τη
συναρμολόγηση (δίψηφα μένουν ενωμένα, ο τόνος μένει πάνω στο γράμμα του).
Ο τονισμός δεν εξασκείται (εκτός scope).

## 6. Leitner — όλα σε `config/learning.json`

```json
{
  "intervals_days": [0, 1, 3, 7, 14, 30],
  "on_error": "drop_one_level",
  "active_set": { "size_min": 8, "size_max": 12, "current_ratio": 0.6 },
  "practice_after_queue_empty": true,
  "practice_schedule_impact_cap": 2,
  "decay": { "enabled": false }
}
```

Τα νούμερα είναι αφετηρία, όχι παιδαγωγική αλήθεια — αλλαγή τους δεν αγγίζει
κώδικα. Φθορά (`decay`): σχεδιασμένη θέση, υλοποίηση Φάση 3, ήπια.

## 7. Αποθήκευση — local-first, sync-ready

- `shared/storage.js` τυλίγει **localStorage** (versioned JSON blob ανά
  profileId). Οι εκατοντάδες λέξεις χωράνε άνετα· αν χρειαστεί ποτέ IndexedDB,
  αλλάζει μόνο αυτό το module.
- Κάθε εγγραφή: σταθερό UUID + `updatedAt`. Καμία εξάρτηση από σειρά εγγραφών.
- **Export/import JSON** (Parent Mode, Φάση 1): πλήρες dump του προφίλ σε
  αρχείο → μεταφορά tablet ↔ κινητό. Στο import, αν υπάρχει ήδη προφίλ,
  ρωτάει ρητά πριν αντικαταστήσει — ποτέ σιωπηλό merge στη v1.
- Schema version μέσα στο blob, για μελλοντικά migrations.

## 8. Invariants — δεν παραβιάζονται ΠΟΤΕ, από κανένα μελλοντικό feature

1. Λανθασμένη πλήρης μορφή λέξης δεν εμφανίζεται πουθενά, ποτέ, με κανέναν
   μηχανισμό (ούτε ως επιλογή, ούτε στιγμιαία στη συναρμολόγηση — γι' αυτό
   pieces χωρίς distractors).
2. Νέα λέξη περνά πρώτα από `intro` (πλήρης+σωστή, τονισμένο γράφημα) πριν
   μπει σε gap/assembly.
3. Λάθος = καμία απώλεια προόδου, κανένα κόκκινο, καμία λέξη «ΛΑΘΟΣ»,
   άμεση δεύτερη ευκαιρία, επιστροφή της λέξης αργότερα.
4. Πρόοδος δυνάμεων ΜΟΝΟ μέσω κατοχύρωσης λέξεων· σπίθες = μόνο διακοσμητικά.
5. Κανένα dark pattern: όχι streaks-τιμωρίες, όχι απώλειες λόγω απουσίας,
   όχι ειδοποιήσεις, όχι χρονική πίεση εκτός μάχης, όχι flashing.
6. Το ίδιο challenge αναφέρεται στο Learning μία φορά, με το αποτέλεσμα της
   πρώτης προσπάθειας.

**Links:** [PROJECT_SPEC.md](PROJECT_SPEC.md) · [DESIGN.md](DESIGN.md) · [BUILD_PLAN.md](BUILD_PLAN.md)
