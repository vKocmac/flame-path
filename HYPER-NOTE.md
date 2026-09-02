# HYPER-NOTE — Flame Path / Ο Δρόμος της Φλόγας
**Ενοποιημένο σημείωμα σχεδιασμού, audit & επόμενων βημάτων**  
Ημερομηνία: 30 Αυγούστου 2026  
Πηγές: Master Development Brief + δεύτερο note ιδεών + ανεξάρτητο audit + νέες προτάσεις

> Αυτό το έγγραφο **δεν αντικαθιστά** τα PROJECT_SPEC.md / DESIGN.md / ARCHITECTURE.md.  
> Τα συμπληρώνει και τα ενοποιεί σε μία πρακτική πηγή αλήθειας για κάθε μελλοντικό session (άνθρωπο ή LLM).

---

## 0. Κανόνες διαδικασίας (αμετάβλητοι)

```
AUDIT → REPORT → DISCUSSION → DECISION → BRANCH → IMPLEMENTATION → TEST → REPORT
```

- Καμία αλλαγή κώδικα χωρίς ρητή έγκριση.
- Κάθε branch έχει μικρό, δηλωμένο scope.
- Silent refactoring απαγορεύεται.
- Scope creep απαγορεύεται.
- Ο ιδιοκτήτης δεν είναι developer · εξηγήσεις σε απλή γλώσσα.
- Acceptance criterion v1: «Θα ζητήσει ο Σταύρος να το ξαναπαίξει μόνος του;»
## 0.1 STATUS ΤΩΝ ΑΠΟΦΑΣΕΩΝ — ΥΠΟΧΡΕΩΤΙΚΗ ΔΙΑΚΡΙΣΗ

Το παρόν έγγραφο περιέχει τρεις διαφορετικές κατηγορίες πληροφορίας. Δεν πρέπει να αντιμετωπίζονται όλες ως implementation requirements.

### APPROVED — ΑΠΟΦΑΣΙΣΜΕΝΑ

Αποτελούν τις τρέχουσες αποφάσεις του project και μπορούν να θεωρηθούν requirements.

### PROPOSED — ΠΡΟΤΕΙΝΟΜΕΝΑ

Είναι ιδέες που θέλουμε να εξετάσουμε. Δεν επιτρέπεται να υλοποιηθούν χωρίς προηγούμενη έγκριση του ιδιοκτήτη.

### OPEN QUESTION — ΑΝΟΙΧΤΟ

Δεν έχει ληφθεί απόφαση. Το Claude μπορεί να αναλύσει, να συγκρίνει επιλογές και να προτείνει λύση, αλλά **δεν αποφασίζει και δεν υλοποιεί μόνο του**.

Όπου το κείμενο είναι ασαφές ως προς την κατηγορία, αντιμετώπισέ το ως **PROPOSED / OPEN QUESTION**, όχι ως requirement.

---

## 0.2 VISUAL & GAMEPLAY APPROVAL GATE

Για οποιαδήποτε σημαντική αλλαγή που επηρεάζει το πώς φαίνεται ή αισθάνεται το παιχνίδι, προηγείται περιγραφή της εμπειρίας πριν από οποιαδήποτε υλοποίηση.

Αυτό περιλαμβάνει ενδεικτικά:

- νέο enemy ή enemy archetype
- νέο attack ή power
- Rage/Miracle sequence
- character animation
- σημαντική αλλαγή UI
- background/day-night transition
- νέο gameplay mechanic
- σημαντική αλλαγή στο combat loop

Η διαδικασία είναι:

**IDEA → VISUAL/GAMEPLAY DESCRIPTION → DISCUSSION → APPROVAL → BRANCH → IMPLEMENTATION**

Δεν αρκεί η τεχνική περιγραφή του πώς θα υλοποιηθεί κάτι. Πρέπει πρώτα να συμφωνηθεί **τι θα βλέπει και τι θα αισθάνεται το παιδί**.

Στόχος είναι το MVP να είναι polished και συνεκτικό από την αρχή, όχι να προστεθούν γρήγορα features και να διορθωθούν αργότερα.

---

## 0.3 ΤΡΕΧΟΥΣΑ ΕΝΤΟΛΗ ΠΡΟΣ ΤΟ CLAUDE

**Αυτή τη στιγμή ΔΕΝ ζητείται implementation.**

Πρώτο βήμα:

**AUDIT ONLY.**

Διάβασε ολόκληρο το repository και σύγκρινέ το με το παρόν HYPER-NOTE και τα υπάρχοντα project documents.

Επέστρεψε:

1. Τι λειτουργεί ήδη σωστά.
2. Ποια από τα requirements υπάρχουν ήδη.
3. Ποια requirements λείπουν.
4. Ποια bugs/regressions υπάρχουν.
5. Ποια σημεία του κώδικα φαίνεται να προκαλούν τα προβλήματα.
6. Ποιες αλλαγές προτείνεις.
7. Τυχόν αρχιτεκτονικά προβλήματα που πρέπει να γνωρίζουμε.
8. Ποια σημεία χρειάζονται απόφαση από τον ιδιοκτήτη.

**Μην τροποποιήσεις αρχεία, μην κάνεις refactoring, μην δημιουργήσεις branch και μην κάνεις commit.**

Αν βρεις κάτι που θεωρείς ότι πρέπει να αλλάξει, πρώτα εξήγησέ το και περίμενε απόφαση.

Ο ιδιοκτήτης θέλει να κάνει το brainstorming και τις αποφάσεις σχεδιασμού ξεχωριστά από την implementation διαδικασία. Το Claude έχει ρόλο τεχνικού συνεργάτη και reviewer, όχι αυτόνομου product designer.
---

## 1. Το όραμα (ενοποιημένο)

Πραγματικό παιχνίδι για ένα συγκεκριμένο παιδί 8 ετών (Σταύρος).  
Η ορθογραφία **είναι** ο βασικός μηχανισμός μάχης, όχι quiz με ninja skin.

Θέλουμε:
«Ένα κανονικό, πορωτικό ninja/fantasy game στο οποίο η ορθογραφία είναι το όπλο.»

Μακροπρόθεσμα μπορεί να γίνει Play Store product ή να επεκταθεί σε άλλα αντικείμενα.  
Αυτό **δεν** αυξάνει το scope του MVP.

**MVP φιλοσοφία:** λίγα πράγματα, αλλά πολύ καλά.  
Ό,τι υπάρχει πρέπει να δείχνει και να συμπεριφέρεται σαν ολοκληρωμένο παιχνίδι.

---

## 2. Παιδαγωγικές αρχές (απαραβίαστες)

### 2.1 Ποτέ ολόκληρη η λάθος λέξη
Δεν εμφανίζεται ποτέ η λανθασμένη πλήρης μορφή ως επιλογή ή ως σταθερό visual.  
Σωστό παράδειγμα: `λ_μάνι` + επιλογές γραφημάτων.  
Λάθος παράδειγμα: «ΛΙΜΑΝΙ» / «ΛΗΜΑΝΙ».

### 2.2 Πρώτη παρουσίαση
Κάθε νέος στόχος (target) περνά πρώτα από τελετή intro (σωστή μορφή + τονισμένο γράφημα) πριν μπει σε gap/assembly.

### 2.3 Μονάδα = γράφημα (range), όχι χαρακτήρας
Υποστήριξη multi-character targets: ι, η, υ, ει, οι, αι, ου, μπ, ντ, διπλά σύμφωνα κ.λπ.

### 2.4 Distractors από λογικές κλάσεις
- /i/ → ι η υ ει οι  
- /o/ → ο ω  
- /e/ → ε αι  
- /u/ → ου  

Όχι τυχαία γράμματα.

### 2.5 Καταγραφή πραγματικού λάθους
Όχι μόνο correct/incorrect.  
Καταγράφεται **ποιο λάθος γράφημα** επέλεξε το παιδί → χρήσιμο για τον γονιό («συγχέει συχνά ι → η»).

### 2.6 Καμία τιμωρητική UI
- Όχι κόκκινο Χ
- Όχι «ΛΑΘΟΣ»
- Όχι απώλεια μόνιμης προόδου
- Άμεση δεύτερη ευκαιρία
- Αφηγηματική συνέπεια μέσα στον κόσμο

---

## 3. Learning Engine (ανεξάρτητο)

Το mini-game ζητά: `getNextChallenge(...)`  
Επιστρέφει challenge + metadata.  
Το game αναφέρει: `reportResult({ correct, chosenGrapheme, ... })`

Το Learning Engine αποφασίζει:
- ποια λέξη/στόχος
- πότε επανέρχεται
- επίπεδο κατοχύρωσης
- ιστορικό
- επανάληψη

**Leitner επίπεδα (ενδεικτικά):**
0 → ίδιο session  
1 → επόμενη ημέρα  
2 → ~3 ημέρες  
3 → ~1 εβδομάδα  
4 → ~2 εβδομάδες  
5 → ~1 μήνας (και μετά επανέρχεται)

Active set session: ~8–12 λέξεις (~60% τρέχουσες / ~40% επανάληψη).

Το Game Engine **δεν** γνωρίζει κανόνες Leitner.

---

## 4. Ο κόσμος & αισθητική

Κατεύθυνση: **Shadow / anime / mystical ninja fantasy**  
Όχι «τυπική εκπαιδευτική εφαρμογή».

Κόσμος όμορφος, μυστηριώδης, κινηματογραφικός.  
Background όχι static:
- δέντρα/κλαδιά που κινούνται απαλά
- φωτιά/δάδες που τρεμοπαίζουν
- particles, σύννεφα, ομίχλη, shadow movement
- ambient effects όπου ταιριάζουν

Ημέρα / Νύχτα: σταδιακή μετάβαση (νύχτα → ξημέρωμα → ημέρα → σούρουπο → νύχτα) συνδεδεμένη με waves / checkpoints / progression. Όχι απότομο switch.

---

## 5. Ο ήρωας — Shadow Master Ninja

Χαρακτηριστικά:
- δυναμικός ninja
- μακρύ μούσι
- αιωρείται
- σκοτεινή / anime αισθητική
- mystical παρουσία

**Κρίσιμο:** Δεν μοιάζει με ακίνητη ζωγραφιά.

Idle:
- απαλή αιώρηση
- μικρή κίνηση σώματος
- ρούχα που κινούνται
- μούσι που αντιδρά ελαφρά
- subtle particles / shadow effects

Attack / Rage: πολύ πιο έντονη κίνηση + shadow trails + περιστροφή + particles + camera feedback + squash/stretch όπου ταιριάζει.

---

## 6. Εχθροί

Όχι ένας τύπος.  
Σταύρος προτιμά δράκους → δράκοι σημαντικοί, αλλά διαφορετικά archetypes:

- **Dragon** — αργός / επιβλητικός / ανθεκτικός
- **Ninja enemy** — γρήγορος και επιθετικός
- **Heavy monster** — αργός, πολλά hits
- **Shadow enemy** — ιδιαίτερη συμπεριφορά
- **Boss** — μεγαλύτερος, διαφορετικό behavior

**Κίνηση εχθρών (κρίσιμο):**
- Πραγματικό idle animation
- Συνεχής κίνηση προς τον παίκτη **βάσει χρόνου**
- Όχι «λάθος → σταθερό βήμα»
- Anticipation + attack preparation ανά archetype
- Suspense από το ότι ο χρόνος περνάει και πλησιάζουν

Waves κλιμακώνονται: λίγοι/αργοί στην αρχή → περισσότεροι/γρηγορότεροι/διαφορετικοί αργότερα.

---

## 7. Orthography → Combat

Η ορθογραφία **είναι** ο τρόπος επίθεσης.

Σωστό:
- attack, damage, combo, visual feedback

Λάθος:
- όχι red X, όχι «ΛΑΘΟΣ»
- χάνεται combo
- μειώνεται Rage
- ο εχθρός συνεχίζει να κινείται (ή επιταχύνει)
- πραγματική gameplay συνέπεια χωρίς παιδαγωγική τιμωρία

---

## 8. Combo & Rage

**Combo:**
- Correct → Combo
- 3 συνεχόμενα σωστά = σημαντικό milestone
- Αντιληπτό μέσω animation, particles, attack feedback, sound, αύξησης έντασης

**Rage / Miracle Power:**
- Γεμίζει από συνεχόμενα σωστά
- Όταν γεμίσει → μεγάλο visual event
- Παραδείγματα εξέλιξης: Fire Tornado → Lightning Storm → Ice Power κ.λπ.
- Κάθε δύναμη έχει **διαφορετικό gameplay αποτέλεσμα**, όχι μόνο χρώμα
  - Ice → επιβραδύνει / παγώνει
  - Lightning → χτυπά πολλούς
  - Fire Tornado → παρασύρει

Powers ξεκλειδώνονται σταδιακά μέσω checkpoints + achievements.  
Credits υπάρχουν ως μελλοντικό currency · **όχι shop στο MVP**.

---

## 9. Progression

**Permanent** (δεν χάνεται):
- checkpoints, κόσμος, achievements, συλλεκτικά, γενική πρόοδος

**Run** (χτίζεται μέσα στο run):
- combo, Rage, προσωρινή δύναμη, προσωρινά power-ups

**Defeat:** επιστροφή στο τελευταίο checkpoint.  
Δεν χάνει όλη την πρόοδο.  
Προσωρινά combat powers μηδενίζονται.

Στόχος σκέψης παιδιού:  
«Την προηγούμενη φορά έφτασα μέχρι εκεί. Τώρα θα ξαναφτάσω και θα πάω παρακάτω.»

---

## 10. Adaptive Difficulty

Προσαρμόζεται **το combat pressure**, όχι η παιδαγωγική απαίτηση.

Αν δυσκολεύεται:
- μειώνεται ταχύτητα εχθρών
- μειώνεται πίεση / αριθμός εχθρών

Αν τα πάει πολύ καλά:
- αυξάνεται πίεση, ταχύτητα, combinations

Η λέξη παραμένει αυτή που πρέπει να μάθει.

---

## 11. Audio

Δύο ανεξάρτητα channels:
- **Music** — χαμηλή, απαλή, mystical, προαιρετική
- **Sound FX** — ανεξάρτητα

Parent/user μπορεί:
- Music ON/OFF
- FX ON/OFF

Όχι ένα master mute που κλείνει τα πάντα.

---

## 12. Parent Mode

- Υπάρχει ήδη.
- Regression που παρατηρήθηκε: εξαφάνιση version indicator + παλιού τρόπου εισόδου (5 taps στο version).
- Τρέχουσα υλοποίηση: 5 taps στο **φεγγάρι** (TitleScene) + fallback κάτω δεξιά γωνία.
- PIN per-device (δεν μπαίνει στο export).
- Word entry: γρήγορη (λέξη → επιλογή target grapheme(s) → Save).
- Στόχος: λίστες μιας εβδομάδας σε < 2 λεπτά.
- Μελλοντικά: CSV/Excel import.
- Export/Import JSON (local-first + sync-ready).

---

## 13. Data Model (λέξη)

Κάθε λέξη μπορεί να περιέχει:
- stable ID
- word (text)
- targets[] (κάθε target = gap range + grapheme + confusionClass + distractors + level + attempts + successes + errorHistory + lastSeen + nextDue + challengeTypesUsed + introduced)
- optional sentence / audio
- timestamps

Local-first + sync-ready.  
Schema versioned (τώρα v2).

---

## 14. Architecture (τρέχουσα + προτιμώμενη)

- Game Engine: Phaser 3 (vendored)
- App/UI: Lightweight vanilla JS ES modules
- Hosting: GitHub Pages (MVP)
- Storage: localStorage (local-first)
- Backup: JSON export/import
- Future sync: Firebase ή Supabase
- **Όχι** backend τώρα, **όχι** Next.js χωρίς ανάγκη, **όχι** bundler

Καθαρό συμβόλαιο Learning ↔ Game (μόνο getNextChallenge / reportResult).

---

## 15. Ιδέες από το δεύτερο note (όλες διατηρούνται)

### 15.1 Gameplay Innovations
- **Living Dictionary / Shadow Gallery / Hall of Echoes**  
  Κάθε κατοχυρωμένη λέξη γίνεται πλάσμα (αυγό → μωρό → ενήλικο) που ζει στον κόσμο.
- **Tension Wave**  
  Κύματα έντασης (ήρεμο → κρεσέντο) συνδεδεμένα με combo.
- **Strike of the Day / Challenge Scroll**  
  Προαιρετική ημερήσια πρόκληση με μικρή ανταμοιβή (όχι forced daily).
- **Path of Letters**  
  Απλό μονοπάτι / checkpoints στον χάρτη αντί για checklist.
- **Focus Mode / Shadow Focus / Ninja Vision**  
  Παγώνει τον χρόνο για 1.5–2s όταν ο εχθρός είναι πολύ κοντά (ειδικά σε νέες ή δύσκολες λέξεις).

### 15.2 Learning Engine Enhancements
- **Word Ghosts**  
  Το λάθος γράφημα εμφανίζεται ως φάντασμα που διαλύεται · το σωστό λάμπει.
- **Shadow Repetition**  
  Διαφορετικός τύπος πρόκλησης κάθε φορά (gap → matching → 3-choice → ordering).
- **Confusion Pairs**  
  Αυτόματη ενίσχυση ζευγών που μπερδεύει συχνά το παιδί (βάσει errorHistory).
- **Audio Cue**  
  Αχνός ήχος/ψίθυρος του φθόγγου όταν εμφανίζεται το κενό.

### 15.3 UX / Feel / World
- Ο κόσμος αντιδρά στην πρόοδο (σκοτάδι → φως όσο κατοχυρώνονται λέξεις).
- Micro-ανταμοιβές κάθε ~30s / κάθε 3–10 σωστά.
- Camera feedback (shake / zoom σε ισχυρές επιθέσεις).
- Προσωπικότητα ήρωα (μικρές αντιδράσεις, όχι ομιλία).
- Μύηση νέων λέξεων μέσω «πυλών» στον κόσμο.

### 15.4 Προτεινόμενο branch από το δεύτερο note
«Branch 01: Living Combat Loop»  
- Εχθρός που πλησιάζει βάσει χρόνου  
- Camera feedback  
- Σωστό → επίθεση με weight  
- Λάθος → απώλεια εδάφους  
- Combo visual escalation  
- Rage burst (πρώτη έκδοση)

---

## 16. Νέες / ενισχυμένες προτάσεις (από το ανεξάρτητο audit)

### 16.1 Attack Weight (υψηλή προτεραιότητα)
Σωστό γράφημα → 0.3–0.4s «φόρτιση» (pull-back ninja + φλόγα που μεγαλώνει στο χέρι) πριν την επίθεση.  
Λάθος → μικρή υποχώρηση ninja + ελαφρύ camera pulse.  
Δίνει αμέσως αίσθηση μάχης χωρίς νέο σύστημα.

### 16.2 Continuous Pressure Model
Εχθροί κινούνται συνεχώς με βάση τον χρόνο.  
Σωστό → σπρώχνει πίσω.  
Λάθος → προσωρινή επιτάχυνση.  
Το combo γίνεται εργαλείο επιβίωσης.

### 16.3 Shadow Focus (προστατευτικό, όχι εύκολο)
Ενεργοποιείται μόνο όταν:
- ο εχθρός είναι πολύ κοντά **και**
- η λέξη είναι νέα ή έχει υψηλό error rate  
Παγώνει μόνο orbs + λέξη για 1.5–2s. Ο κόσμος συνεχίζει αχνά.

### 16.4 Ninja Idle Life πριν από Powers
Πριν οποιοδήποτε Rage/Power:
- απαλή αιώρηση (Y + scale)
- subtle shoulder/body sway
- κορδέλα ή μανίκι με secondary motion
- πολύ αχνό particle στο χέρι της φλόγας

Χωρίς αυτό, κάθε power θα κάθεται σε «ακίνητη ζωγραφιά».

### 16.5 Micro-feedback ladder (οπτικό combo)
- 3 σωστά → φλόγα χεριού πιο φωτεινή  
- 6 σωστά → μικρό shadow trail στην επίθεση  
- 9 σωστά → ελαφρύ camera zoom-in 0.5s  

Χτίζει το combo οπτικά πριν εμφανιστεί μεγάλο Rage.

### 16.6 Parent Mode polish
- Κράτα moon entry ως κύρια.
- Μέσα στο Parent Mode (μετά το PIN) δείξε υπενθύμιση «Είσοδος: 5 taps στο φεγγάρι».
- Μετά από Save λέξης → προσωρινό μήνυμα «Η λέξη μπήκε — θα εμφανιστεί στην επόμενη μάχη».

### 16.7 Responsive (πρακτικό)
Κράτα 1280×720 + FIT.  
Πρόσθεσε ελάχιστο ορατό μέγεθος για orbs και περγαμηνή (τα πιο κρίσιμα touch targets).  
Αποφυγή υπερβολικά μικρών στόχων σε tablet.

### 16.8 Προτεινόμενη σειρά προτεραιότητας (πρακτική)
1. Continuous enemy movement + attack weight  
2. Ninja idle life  
3. Responsive orbs / περγαμηνή  
4. Visual combo escalation (χωρίς ακόμα full Rage)  
5. Shadow Focus  

---

## 17. Τεχνικές λεπτομέρειες υλοποίησης (για LLMs / sessions)

Αυτά είναι σημεία όπου συχνά «κολλάνε» άλλα μοντέλα. Ακολούθησέ τα.

### 17.1 Continuous enemy movement (αντί για step)
Μην κάνεις `x -= constant` στο λάθος.  
Κράτα ανά εχθρό:
```js
enemy.baseSpeed = 18;          // pixels / second (ξεκίνα χαμηλά)
enemy.speedMultiplier = 1;
// στο update (ή σε timer 16ms):
enemy.x -= enemy.baseSpeed * enemy.speedMultiplier * (delta / 1000);
```
Στο σωστό: `enemy.x += knockback` + προσωρινό `speedMultiplier = 0.4` για 400ms.  
Στο λάθος: `speedMultiplier = 1.6` για 800ms.  
Clamp ώστε να μην περάσει RETREAT_X χωρίς regroup.

### 17.2 Ninja idle χωρίς να σπάει το attack
Χρησιμοποίησε **δύο layers**:
- container για θέση + μεγάλα tweens (attack)
- εσωτερικό graphics/sprite για idle bob

Idle:
```js
this.tweens.add({
  targets: ninjaBody,
  y: '-=6',
  angle: { from: -1.2, to: 1.2 },
  duration: 2200,
  yoyo: true,
  repeat: -1,
  ease: 'Sine.easeInOut'
});
```
Στο attack: `this.tweens.killTweensOf(ninjaBody)` προσωρινά, μετά ξαναξεκίνα idle.

### 17.3 Attack charge (weight)
Στο `chooseOrb` correct path:
1. `busy = true`
2. Tween ninja `angle: -12`, hand flame scale ↑, 320ms
3. Στο onComplete → εκτόξευση bolt
Μην ξεκινάς το projectile αμέσως. Το κενό 300ms είναι αυτό που δίνει «βάρος».

### 17.4 Camera feedback (ασφαλές)
```js
this.cameras.main.shake(180, 0.006);           // πολύ μικρό
// ή
this.cameras.main.zoomTo(1.04, 120).then(() => this.cameras.main.zoomTo(1, 180));
```
Μην χρησιμοποιείς μεγάλα values — σε tablet γίνεται δυσάρεστο.

### 17.5 Combo visual χωρίς νέο UI σύστημα
Κράτα `this.combo = 0`.  
Στο σωστό: `combo++` · στο λάθος: `combo = 0`.  
Οπτικά:
- combo ≥ 3 → πρόσθεσε tint/αλλαγή alpha στη φλόγα του χεριού
- combo ≥ 6 → ενεργοποίησε trail particles στο bolt
- combo ≥ 9 → μικρό zoom

Μην εμφανίζεις μεγάλο νούμερο στην οθόνη στην αρχή. Πρώτα το feel.

### 17.6 Shadow Focus (τεχνικά)
Όταν `frontEnemy.x < threshold` **και** (target.level === 0 ή error rate υψηλό):
```js
this.physics?.pause?.(); // αν υπάρχει
this.time.timeScale = 0.15; // ή παύση μόνο των orbs + scroll
// μετά από 1800ms επαναφορά
```
Μην παγώνεις ολόκληρο το scene αν μπορείς — μόνο τα interactive elements.

### 17.7 Responsive orbs
Τα orbs αυτή τη στιγμή έχουν σταθερό μέγεθος.  
Υπολόγισε scale factor από `this.scale.displaySize` και εφάρμοσε ελάχιστο:
```js
const minOrb = 52; // logical pixels
const scale = Math.max(1, minOrb / 40);
orb.setScale(scale);
```
Ίδιο για το gap underline και το touch zone.

### 17.8 Parent Mode reminder
Μετά το επιτυχές PIN, μέσα στο `renderMain`:
```html
<p class="pm-note">Είσοδος στο Parent Mode: 5 γρήγορα αγγίγματα στο φεγγάρι της αρχικής οθόνης.</p>
```
Μετά το Save:
```js
// προσωρινό toast 1.5s
showToast('Η λέξη μπήκε — θα εμφανιστεί στην επόμενη μάχη');
```

### 17.9 Rage (πρώτη έκδοση — απλή αλλά θεαματική)
Όταν `rage >= 100`:
- πάγωσε εχθρούς
- ninja μπαίνει στο κέντρο
- μεγάλο particle burst + camera shake
- όλοι οι εχθροί παίρνουν damage / πετιούνται πίσω
- reset rage
Μην υλοποιείς ακόμα διαφορετικά powers. Ένα visual event αρκεί για το πρώτο branch.

### 17.10 Τι να ΜΗΝ αγγίξεις στο πρώτο implementation branch
- Learning Engine / scheduler / config
- Schema storage
- Parent Mode logic (μόνο μικρά UI messages)
- Νέους εχθρούς / νέους κόσμους
- Assembly challenge
- Day/night cycle
- Shop / credits economy

---

## 18. Confirmed bugs & regressions (από audit)

| # | Θέμα | Κατάσταση |
|---|------|-----------|
| 1 | Orbs/bubbles δεν εμφανίζονται όταν δεν υπάρχουν λέξεις ή challenge = null | Υπαρκτό path (`showNoWords`) |
| 2 | Εχθροί = step στο λάθος, όχι continuous | Σχεδιαστικό κενό |
| 3 | Ninja σχεδόν static | Σχεδιαστικό κενό |
| 4 | Εχθροί «σακούλες που αναπνέουν» | Σχεδιαστικό κενό |
| 5 | Responsive / μικρό μέγεθος σε tablet-mobile | Πιθανό regression από FIT 1280×720 |
| 6 | Version indicator εξαφανισμένο | Regression (τώρα είσοδος = moon) |
| 7 | Δεν υπάρχει combo / Rage / powers | Δεν υλοποιήθηκε ακόμα (Βήμα 4) |
| 8 | Audio = master mute | Αντίθετο με brief |

Η αλυσίδα word storage → learning → challenge → orbs είναι σωστή στον κώδικα. Αν οι λέξεις υπάρχουν στο storage, τα orbs πρέπει να εμφανίζονται.

---

## 19. Προτεινόμενο επόμενο branch (ενοποιημένο)

**Όνομα:** `fix/living-combat-loop`

**Στόχος:** Το βασικό loop να αισθάνεται παιχνίδι, όχι άσκηση.

**Περιεχόμενο (μόνο αυτά):**
1. Continuous time-based enemy movement + προσωρινή επιτάχυνση/επιβράδυνση
2. Ninja idle life (αιώρηση + subtle motion)
3. Attack charge / weight στο σωστό
4. Λάθος → μικρή υποχώρηση ninja + camera pulse
5. Visual combo escalation (3 / 6 / 9)
6. Responsive ελάχιστο μέγεθος orbs + περγαμηνή
7. (Προαιρετικά αν χωράει) πρώτη έκδοση Rage burst
8. Μικρά Parent Mode messages (reminder + «η λέξη μπήκε»)

**Έξω από το branch:**
- Νέοι εχθροί / archetypes
- Νέες δυνάμεις πέρα από το πρώτο burst
- Day/night
- Assembly
- Living Dictionary / Path of Letters / Strike of the Day
- Αλλαγές Learning Engine

**Κριτήριο επιτυχίας branch:**
Ο Σταύρος παίζει 8–10 λεπτά και το combat νιώθει ζωντανό, με πίεση χρόνου και ικανοποίηση στο σωστό χτύπημα.

---

## 20. Μη-στόχοι (παραμένουν)

- Multiplayer, accounts, online backend, AI runtime
- Shop / IAP / dark patterns / streak punishment / forced daily
- Native Android build
- Τεράστιος χάρτης / 20 mini-games / σύνθετο RPG / inventory
- Οτιδήποτε αυξάνει scope χωρίς να υπηρετεί το «θέλει να ξαναπαίξει»

---

## 21. Acceptance criteria (ενοποιημένα)

**Technical**
- Ανοίγει σωστά σε κινητό & tablet
- Χρησιμοποιεί σωστά την οθόνη (δεν είναι μικροσκοπικό)
- Touch-first, offline, δεν χάνει πρόοδο σε reload

**Gameplay**
- Εμφανίζονται πραγματικά challenges + grapheme options
- Σωστό → επίθεση με βάρος
- Λάθος → συνέπεια χωρίς τιμωρητικό UI
- Εχθροί κινούνται συνεχώς
- Combo υπάρχει και γίνεται αισθητό
- Defeat → checkpoint

**Visual**
- Ninja έχει idle + attack life
- Εχθροί δεν είναι static
- Background κινείται διακριτικά

**Learning**
- Η απόδοση βελτιώνεται και μεταφέρεται εκτός εφαρμογής (έλεγχος από γονιό)

---

## 22. Τελική αρχή

Μην προσπαθήσεις να εντυπωσιάσεις προσθέτοντας features.  
Κάνε το υπάρχον παιχνίδι:

**μικρό, όμορφο, ζωντανό, άμεσο και πραγματικά διασκεδαστικό.**

Ο Σταύρος πρέπει να βλέπει τον Shadow Master Ninja να αιωρείται, τα ρούχα και το μούσι να κινούνται, τους εχθρούς να πλησιάζουν με τον χρόνο, το περιβάλλον να ζει, τις επιθέσεις να έχουν βάρος και τα powers να γίνονται όλο και πιο εντυπωσιακά — και όλα αυτά να υπηρετούν έναν σκοπό:

**Να θέλει να ξαναπαίξει και, χωρίς να το αισθάνεται σαν διάβασμα, να γράφει όλο και σωστότερα.**

---

*Τέλος HYPER-NOTE*  
Επόμενο βήμα μετά από αυτό το έγγραφο: συζήτηση → έγκριση scope → δημιουργία branch `fix/living-combat-loop` → υλοποίηση.
