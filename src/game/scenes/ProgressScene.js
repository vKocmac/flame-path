// Η Πρόοδός μου (NEXT-FIXES Θ1, 18/09/2026) — η οθόνη του ΠΑΙΔΙΟΥ.
//
// Ο Κοσμάς: «δεν έχει κάπου να βλέπεις την εξέλιξη… ένα dashboard… με κάποιο
// ranking, με κάποιο ωραίο γραφικό, ότι προχωράει κάτι… το παιδί… να βλέπει
// ότι κάτι κάνει καλύτερα και ότι κάπου προοδεύει… να βλέπουμε ότι η λέξη
// αυτή την έμαθε».
//
// Σχήματα πρώτα, λίγες λέξεις (ιδιοκτήτης 11/09): η σκάλα των ζωνών, ο
// κύκλος της μέρας, οι φλόγες του σερί, οι μπάρες της εβδομάδας, ο τοίχος
// με τις λέξεις που ανάβουν. Οι λέξεις φαίνονται ΠΑΝΤΑ στη σωστή μορφή.
// Τίποτα εδώ δεν τιμωρεί: χαμένη μέρα = άδεια μπάρα, όχι μήνυμα.
// Ανοίγει από τον τίτλο· ο τίτλος από κάτω ΠΑΓΩΝΕΙ (όπως το κατάστημα).

import { NUM, HEX, FONT } from '../../theme/palette.js';
import { TXT } from '../../theme/strings.js';
import * as audio from '../../theme/audio.js';
import * as store from '../../shared/storage.js';
import * as engine from '../../learning/engine.js';
import * as world from '../world.js';
import * as journey from '../journey.js';
import * as shop from '../shop.js';
import { currentStreak, lastDays, isMastered } from '../../learning/daily.js';

const W = 1280, H = 720;
const INK = '#3B2A1A';

export default class ProgressScene extends Phaser.Scene {
  constructor() { super('Progress'); }

  create() {
    this.leaving = false;
    this.calm = world.isCalm();
    this.add.rectangle(W / 2, H / 2, W, H, NUM.shadow).setAlpha(.97).setInteractive();

    const st = store.loadState();
    const who = store.activeProfile(st);
    const daily = engine.daily(who.profile.id) || who.profile.daily || null;
    const now = new Date();

    const title = this.add.text(W / 2, 52, TXT.progTitle, {
      fontFamily: FONT.ui, fontSize: '40px', fontStyle: '700', color: HEX.flameCore
    }).setOrigin(.5);
    title.setShadow(0, 0, HEX.flame, 18, false, true);
    this.backButton();

    this.beltCard(who, 40, 96, 600, 196);
    this.todayCard(daily, now, 40, 306, 600, 176);
    this.weekCard(daily, now, 40, 496, 600, 200);
    this.wallCard(who, daily, 660, 96, 580, 400);
    this.nextCard(who, 660, 510, 580, 186);
  }

  card(x, y, w, h, label) {
    const g = this.add.graphics();
    g.fillStyle(NUM.night, .92);
    g.fillRoundedRect(x, y, w, h, 22);
    g.lineStyle(2, NUM.smoke, .3);
    g.strokeRoundedRect(x, y, w, h, 22);
    if (label) {
      this.add.text(x + 24, y + 22, label, {
        fontFamily: FONT.ui, fontSize: '19px', fontStyle: '700', color: HEX.lantern
      }).setOrigin(0, .5).setAlpha(.9);
    }
    return g;
  }

  // Η σκάλα των ζωνών: όσες φόρεσε ανάβουν, η τρέχουσα μεγάλη, και μια
  // μπάρα «πόσο λείπει» για την επόμενη.
  beltCard(who, x, y, w, h) {
    this.card(x, y, w, h);
    const belt = journey.beltOf(who);
    const learned = journey.learnedWords(who);
    const g = this.add.graphics();
    world.drawBelt(g, x + 86, y + 58, 2.1, journey.beltColor(belt), journey.beltEdge(belt));
    const name = this.add.text(x + 170, y + 44, TXT.belts[belt], {
      fontFamily: FONT.ui, fontSize: '32px', fontStyle: '700', color: HEX.flameCore
    }).setOrigin(0, .5);
    name.setShadow(0, 0, HEX.flame, 12, false, true);
    const roads = (who.profile.journey && who.profile.journey.cycle) || 0;
    // Ο6: όσες βρήκε σωστά μία μέρα και κλειδώνουν αν τις βρει και σε άλλη
    const ripening = who.words.filter((wd) => !wd.archived && wd.targets.length
      && wd.targets.every((t) => t.level >= 1) && wd.targets.some((t) => t.level < journey.MASTERY_LEVEL)).length;
    this.add.text(x + 170, y + 82, TXT.progLearned(learned) + (ripening ? ` · ${TXT.progRipening(ripening)}` : '')
      + (roads ? ` · ${TXT.progRoads(roads)}` : ''), {
      fontFamily: FONT.ui, fontSize: '21px', color: HEX.parchment
    }).setOrigin(0, .5);

    const nx = journey.toNextBelt(who);
    const bx = x + 30, by = y + 110, bw = w - 60, bh = 16;
    g.fillStyle(NUM.shadow, 1);
    g.fillRoundedRect(bx, by, bw, bh, bh / 2);
    if (nx) {
      const from = journey.BELTS[belt].need;
      const f = Math.max(0, Math.min(1, (learned - from) / (nx.need - from)));
      g.fillStyle(journey.beltColor(nx.next), 1);
      if (f > 0) g.fillRoundedRect(bx, by, Math.max(bh, bw * f), bh, bh / 2);
      this.add.text(bx, by + 30, TXT.progNextBelt(Math.max(0, nx.need - learned), TXT.belts[nx.next]), {
        fontFamily: FONT.ui, fontSize: '18px', color: HEX.smoke
      }).setOrigin(0, .5);
    } else {
      g.fillStyle(NUM.flameCore, 1);
      g.fillRoundedRect(bx, by, bw, bh, bh / 2);
      this.add.text(bx, by + 30, TXT.progTopBelt, { fontFamily: FONT.ui, fontSize: '18px', color: HEX.lantern }).setOrigin(0, .5);
    }
    // Όλες οι ζώνες σε σειρά, μικρές: το ranking του καράτε
    const n = journey.BELTS.length, step = (w - 60) / n;
    for (let i = 0; i < n; i++) {
      const cx = bx + step * i + step / 2;
      const on = i <= belt;
      const sg = this.add.graphics().setAlpha(on ? 1 : .22);
      world.drawBelt(sg, cx, y + 170, .42, journey.beltColor(i), journey.beltEdge(i));
    }
  }

  // Σήμερα: κύκλος που γεμίζει (λέξεις της δεκαπεντάδας σωστές / όλες) και
  // οι φλόγες του σερί.
  todayCard(daily, now, x, y, w, h) {
    this.card(x, y, w, h, TXT.progToday);
    const total = daily && daily.ids ? daily.ids.length : 0;
    const done = daily && daily.correct ? daily.correct.filter((id) => daily.ids.includes(id)).length : 0;
    const f = total ? done / total : 0;
    const cx = x + 110, cy = y + 100, r = 52;
    const g = this.add.graphics();
    g.lineStyle(14, NUM.nightHigh, 1);
    g.strokeCircle(cx, cy, r);
    if (f > 0) {
      g.lineStyle(14, f >= 1 ? NUM.flameCore : NUM.flame, 1);
      g.beginPath();
      g.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f, false);
      g.strokePath();
    }
    this.add.text(cx, cy, `${done}/${total}`, {
      fontFamily: FONT.ui, fontSize: '30px', fontStyle: '700', color: f >= 1 ? HEX.flameCore : HEX.parchment
    }).setOrigin(.5);
    if (f >= 1 && !this.calm) {
      const glow = this.add.image(cx, cy, 'glow-lantern').setScale(1.4).setAlpha(.35).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: glow, alpha: .12, scale: 1.7, duration: 900, yoyo: true, repeat: -1 });
    }

    // Σερί: μία φλόγα ανά μέρα (ως 7), και ο αριθμός
    const streak = currentStreak(daily, now);
    const best = (daily && daily.best) || 0;
    const sx = x + 230;
    this.add.text(sx, y + 62, TXT.progStreak, { fontFamily: FONT.ui, fontSize: '20px', color: HEX.lantern }).setOrigin(0, .5);
    for (let i = 0; i < 7; i++) {
      const lit = i < Math.min(streak, 7);
      const fl = this.add.image(sx + 18 + i * 44, y + 110, 'flame').setScale(.3)
        .setAlpha(lit ? 1 : .15).setBlendMode(lit ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
      if (!lit) fl.setTint(NUM.smoke);
      else if (!this.calm) this.tweens.add({ targets: fl, scaleY: .34, duration: 500 + i * 60, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
    this.add.text(sx, y + 150, `${TXT.streakDays(streak)} · ${TXT.progBest} ${best}`, {
      fontFamily: FONT.ui, fontSize: '18px', color: HEX.smoke
    }).setOrigin(0, .5);
    if (total) {                                      // Μ3: πόσες από χθες, πόσες καινούριες
      const carried = Math.min(daily.carried || 0, total);
      this.add.text(cx, y + 164, TXT.progFromYesterday(carried, total - carried), {
        fontFamily: FONT.ui, fontSize: '15px', color: HEX.smoke
      }).setOrigin(.5);
    }
  }

  // Η εβδομάδα: μπάρα = σωστές απαντήσεις της μέρας, αστεράκι = λέξεις που
  // έμαθε εκείνη τη μέρα. Η σημερινή φωτεινή.
  weekCard(daily, now, x, y, w, h) {
    this.card(x, y, w, h, TXT.progWeek);
    const days = lastDays(daily, now, 7);
    const max = Math.max(10, ...days.map((d) => d.c));
    const g = this.add.graphics();
    const bw = 46, gap = (w - 60 - bw * 7) / 6, base = y + h - 36, top = y + 52;
    days.forEach((d, i) => {
      const bx = x + 30 + i * (bw + gap);
      const bh = Math.round((base - top) * d.c / max);
      const today = i === 6;
      g.fillStyle(NUM.nightHigh, .8);
      g.fillRoundedRect(bx, top, bw, base - top, 8);
      if (bh > 0) {
        g.fillStyle(today ? NUM.flameCore : NUM.flame, 1);
        g.fillRoundedRect(bx, base - bh, bw, bh, 8);
      }
      if (d.c) {
        this.add.text(bx + bw / 2, base - bh - 12, String(d.c), {
          fontFamily: FONT.ui, fontSize: '15px', color: HEX.parchment
        }).setOrigin(.5).setAlpha(.8);
      }
      for (let k = 0; k < Math.min(d.l, 4); k++) {                // λέξεις που έμαθε
        const star = this.add.graphics();
        star.fillStyle(NUM.lantern, 1);
        const sx = bx + bw / 2, sy = base - 12 - k * 16;
        star.fillPoints([[0, -7], [2, -2], [7, 0], [2, 2], [0, 7], [-2, 2], [-7, 0], [-2, -2]]
          .map(([a, b]) => new Phaser.Geom.Point(sx + a, sy + b)), true);
      }
      const dd = new Date(d.key + 'T12:00:00');
      this.add.text(bx + bw / 2, base + 16, TXT.progDays[dd.getDay()], {
        fontFamily: FONT.ui, fontSize: '16px', color: today ? HEX.lantern : HEX.smoke
      }).setOrigin(.5);
    });
  }

  // Ο τοίχος των λέξεων: οι κατακτημένες χρυσές και αναμμένες, όσες μαθαίνει
  // πορτοκαλί με κουκκίδες (πόσο κοντά είναι), οι σημερινές με περίγραμμα.
  wallCard(who, daily, x, y, w, h) {
    this.card(x, y, w, h, TXT.progWall);
    const m = journey.MASTERY_LEVEL;
    const today = new Set((daily && daily.ids) || []);
    const words = who.words.filter((wd) => wd.targets.length && wd.targets.some((t) => t.introduced));
    const learned = words.filter((wd) => isMastered(wd, m));
    const learning = words.filter((wd) => !isMastered(wd, m)).sort((a, b) => today.has(b.id) - today.has(a.id));
    const cols = 4, tw = 128, th = 44, gx = (w - 40 - cols * tw) / (cols - 1), gy = 10;
    const rows = Math.floor((h - 60) / (th + gy));
    const list = [...learned.map((wd) => [wd, true]), ...learning.map((wd) => [wd, false])].slice(0, cols * rows);
    list.forEach(([wd, done], i) => {
      const tx = x + 20 + (i % cols) * (tw + gx), ty = y + 46 + Math.floor(i / cols) * (th + gy);
      const g = this.add.graphics();
      g.fillStyle(done ? NUM.lantern : NUM.nightHigh, done ? .95 : .9);
      g.fillRoundedRect(tx, ty, tw, th, 10);
      if (today.has(wd.id)) { g.lineStyle(2.5, NUM.flame, 1); g.strokeRoundedRect(tx, ty, tw, th, 10); }
      if (!done) {                                                 // πόσο κοντά στην κατάκτηση
        const lv = Math.min(...wd.targets.map((t) => t.level));
        for (let k = 0; k < m; k++) {
          g.fillStyle(k < lv ? NUM.flame : NUM.shadow, 1);
          g.fillCircle(tx + tw - 14 - k * 11, ty + th - 9, 4);
        }
      }
      const t = this.add.text(tx + (done ? tw / 2 : 12), ty + th / 2 - (done ? 0 : 3), wd.text, {
        fontFamily: FONT.word, fontSize: '22px', fontStyle: '700', color: done ? INK : HEX.parchment
      }).setOrigin(done ? .5 : 0, .5);
      if (t.width > tw - (done ? 12 : 22)) t.setScale((tw - (done ? 12 : 22)) / t.width);
    });
    const more = learned.length + learning.length - list.length;
    if (more > 0) {
      this.add.text(x + w - 24, y + 22, `+${more}`, { fontFamily: FONT.ui, fontSize: '18px', color: HEX.smoke }).setOrigin(1, .5);
    }
    // Ο6: τι σημαίνουν οι κουκκίδες
    this.add.text(x + w - (more > 0 ? 70 : 24), y + 22, TXT.progWallHow, {
      fontFamily: FONT.ui, fontSize: '15px', color: HEX.smoke
    }).setOrigin(1, .5);
  }

  // Επόμενο ξεκλείδωμα στον Πάγκο: η επόμενη δύναμη ή όπλο που δεν έχει
  nextCard(who, x, y, w, h) {
    this.card(x, y, w, h, TXT.progNext);
    const gear = store.getShop(store.loadState());
    const belt = journey.beltOf(who);
    const it = shop.SHOP.filter((i) => (i.cat === 'power' || i.cat === 'weapon') && i.price > 0 && !gear.owned.includes(i.id))
      .sort((a, b) => a.belt - b.belt || a.price - b.price)[0];
    if (!it) return;
    const g = this.add.graphics();
    world.drawShopIcon(g, it, x + 80, y + 100, 44, 1);
    const [name, desc] = TXT.shopItems[it.id] || [it.id, ''];
    this.add.text(x + 150, y + 70, name, {
      fontFamily: FONT.ui, fontSize: '26px', fontStyle: '700', color: HEX.flameCore
    }).setOrigin(0, .5);
    this.add.text(x + 150, y + 104, desc, {
      fontFamily: FONT.ui, fontSize: '17px', color: HEX.parchment, wordWrap: { width: w - 180 }
    }).setOrigin(0, .5).setAlpha(.85);
    const ready = belt >= it.belt;
    world.drawBelt(g, x + 170, y + 148, .6, journey.beltColor(it.belt), journey.beltEdge(it.belt));
    this.add.text(x + 196, y + 150, ready ? `✦ ${it.price}` : `${TXT.belts[it.belt]} · ✦ ${it.price}`, {
      fontFamily: FONT.ui, fontSize: '19px', fontStyle: '700', color: ready ? HEX.lantern : HEX.smoke
    }).setOrigin(0, .5);
  }

  backButton() {
    const back = this.add.graphics({ x: 44, y: 52 });
    back.fillStyle(NUM.night, 1); back.fillCircle(0, 0, 28);
    back.lineStyle(2.5, NUM.smoke, .7); back.strokeCircle(0, 0, 28);
    back.lineStyle(5, NUM.parchment, .9);
    back.strokePoints([new Phaser.Geom.Point(6, -12), new Phaser.Geom.Point(-6, 0), new Phaser.Geom.Point(6, 12)]);
    this.add.zone(44, 52, 76, 76).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.close());
  }

  close() {
    if (this.leaving) return;
    this.leaving = true;
    audio.chime(0);
    const title = this.scene.get('Title');
    if (title) title.userPaused = false;
    this.scene.resume('Title');
    this.scene.stop();
  }
}
