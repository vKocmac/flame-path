// Η οθόνη του κόσμου: νυχτερινό τοπίο με το ντότζο. Ο κοινός κόσμος
// έρχεται από world.js· εδώ μένει μόνο ό,τι είναι αποκλειστικά του τίτλου.

import { NUM, HEX, FONT } from '../../theme/palette.js';
import { TXT } from '../../theme/strings.js';
import * as audio from '../../theme/audio.js';
import { buildTextures } from '../textures.js';
import * as world from '../world.js';
import * as store from '../../shared/storage.js';
import * as journey from '../journey.js';
import * as shop from '../shop.js';

const { W, H } = world;

export default class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    buildTextures(this);
    const calm = world.isCalm();
    this.calm = calm;
    // Το Phaser ξαναχρησιμοποιεί το αντικείμενο της σκηνής: χωρίς αυτό, μετά
    // την πρώτη μάχη και ‹ (πίσω), το «leaving» έμενε true και η φωτιά ΔΕΝ
    // ξαναπατιόταν — το παιδί κολλούσε στον τίτλο ώσπου να κλείσει η
    // εφαρμογή (βρέθηκε 11/09).
    this.leaving = false;
    this.userPaused = false;                // το κατάστημα την παγώνει (Ζ11)

    world.buildSky(this);
    world.buildStars(this, calm);
    const moonZone = world.buildMoon(this, calm);
    world.buildClouds(this, calm);
    if (!calm) world.buildBirds(this);

    world.ridge(this, world.RIDGE_HAZE, NUM.ridgeHaze, .55);
    world.ridge(this, world.RIDGE_FAR, NUM.ridgeFar);
    world.buildMist(this, calm);
    world.ridge(this, world.RIDGE_MID, NUM.ridgeMid);
    world.buildDojo(this, 384, H * .653, 1.28, calm);
    world.ridge(this, world.RIDGE_NEAR, NUM.ridgeNear);
    world.buildTorii(this, 1062, H * .858, calm);
    world.buildBamboo(this, 112, H * .885, 1.0);
    world.buildBamboo(this, 1208, H * .895, 0.82);
    world.buildGround(this, { path: 'narrow' });
    world.buildGroundDetail(this, 0, calm);

    world.lantern(this, 168, 646, .95, calm);
    world.lantern(this, 930, 656, .9, calm);
    world.lantern(this, 1158, 640, .8, calm);

    this.buildHero(522, 668, journey.beltColor(store.getJourney(store.loadState()).cycle));
    this.buildBrazier(640, 676);
    this.buildTitle();
    this.buildOverlay();
    this.armParentEntry(moonZone);
  }

  // Κρυφή είσοδος γονέα: 5 γρήγορα αγγίγματα στο φεγγάρι.
  armParentEntry(zone) {
    let taps = [];
    zone.setInteractive().on('pointerdown', () => {
      const t = Date.now();
      taps = taps.filter((v) => t - v < 4000);
      taps.push(t);
      if (taps.length >= 5) { taps = []; window.flameParent?.open(); }
    });
  }

  // Ο ήρωας στον τίτλο (φινίρισμα 11/09): στέκεται δίπλα στη φωτιά και την
  // κοιτά, με τη ζώνη του κύκλου του — η πρόοδος φαίνεται πριν καν αρχίσει
  // η μάχη. Ίδια σιλουέτα με τη μάχη· το φως εδώ έρχεται από τη φωτιά.
  buildHero(x, y, beltColor) {
    const P = (px, py) => new Phaser.Geom.Point(px, py);
    const shadow = this.add.ellipse(0, 3, 90, 14, NUM.shadow).setAlpha(.45);
    const tails = this.add.graphics();
    const g = this.add.graphics();
    g.fillStyle(NUM.dojoRoof, 1);
    g.fillRect(-19, -14, 15, 14);
    g.fillRect(6, -14, 15, 14);
    g.fillRoundedRect(-26, -74, 52, 62, 15);
    g.fillCircle(0, -92, 27);
    const rim = this.add.graphics();                    // η φωτιά φωτίζει τη δεξιά κόψη
    rim.lineStyle(2.5, NUM.flame, .4);
    rim.beginPath();
    rim.arc(0, -92, 26, -1.2, .9, false);
    rim.strokePath();
    rim.lineStyle(2, NUM.flame, .28);
    rim.lineBetween(25.5, -62, 25.5, -24);
    const eyes = this.add.graphics();
    eyes.fillStyle(NUM.parchment, .95);
    eyes.fillRoundedRect(-17, -99, 34, 8, 4);
    const belt = this.add.graphics();
    belt.fillStyle(beltColor, 1);
    belt.fillRect(-26, -40, 52, 8);
    belt.fillStyle(beltColor, .85);
    belt.fillPoints([P(16, -34), P(28, -18), P(22, -16), P(11, -32)], true);
    // Ό,τι αγόρασε από τον έμπορο (Ζ11): μάσκα στο πρόσωπο, χρώμα κορδέλας
    const gear = store.getShop(store.loadState());
    const mask = this.add.graphics();
    if (gear.mask) world.drawMask(mask, gear.mask.id);
    const rib = gear.ribbon && shop.item(gear.ribbon);
    const ribbon = rib ? NUM[rib.color] : NUM.dojoRoof;
    const hero = this.add.container(x, y, [shadow, tails, g, rim, mask, eyes, belt]).setScale(1.15);

    // Οι δύο ουρές της κορδέλας κυματίζουν (από το update της σκηνής — ένας
    // listener θα στοιβαζόταν σε κάθε επιστροφή στον τίτλο)
    this.heroTails = (time) => {
      tails.clear();
      tails.fillStyle(ribbon, 1);
      for (const [ph, len, base, lift] of [[0, 44, -100, 10], [1.9, 34, -94, 3]]) {
        const top = [], bot = [];
        for (let i = 0; i <= 8; i++) {
          const s = i / 8, w = 4.2 - 2.6 * s;
          const px = -20 - s * len, py = base - s * lift + Math.sin(time * .009 + s * 3.2 + ph) * 5.5 * s;
          top.push(P(px, py - w));
          bot.push(P(px, py + w));
        }
        tails.fillPoints([...top, ...bot.reverse()], true);
      }
    };
    this.heroTails(0);
    if (!this.calm) {
      this.tweens.add({ targets: hero, scaleY: 1.17, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  update(time) {
    if (this.heroTails && !this.calm) this.heroTails(time);
  }

  // Το Ντότζο (BUILD_PLAN βήμα 6): τι έχει κερδίσει ο νίντζα — ζώνη, δυνάμεις,
  // τεχνικές — και πόσες κατακτημένες λέξεις λείπουν για την επόμενη.
  // ΣΧΗΜΑΤΑ, όχι λέξεις (ιδιοκτήτης 11/09): ο Δρόμος με τα 7 μετάλλια των
  // σταθμών και τη ζώνη στην αρχή· από κάτω οι δυνάμεις (οι κλειδωμένες
  // σβηστές) και οι τεχνικές με δαχτυλίδι που γεμίζει όσο κατακτά λέξεις.
  buildDojoPanel(jr, who) {
    const P = (x, y) => new Phaser.Geom.Point(x, y);
    const g = this.add.graphics().setDepth(45);
    const n = journey.STATIONS, step = 66, y = 192;
    const x0 = W / 2 - step * (n - 1) / 2 + 30;              // δεξιά από την κορυφή της παγόδας

    g.lineStyle(4, NUM.nightHigh, .95);
    g.lineBetween(x0, y, x0 + step * (n - 1), y);
    if (jr.station > 0) {
      g.lineStyle(4, NUM.flame, .95);
      g.lineBetween(x0, y, x0 + step * jr.station, y);
    }
    for (let i = 0; i < n; i++) {
      const cx = x0 + i * step, here = i === jr.station, done = i < jr.station;
      const r = here ? 25 : 18;
      if (here) {
        const glow = this.add.image(cx, y, 'glow-flame').setScale(.55).setAlpha(.7)
          .setBlendMode(Phaser.BlendModes.ADD).setDepth(44);
        if (!this.calm) {
          this.tweens.add({ targets: glow, alpha: .3, scale: .7, duration: 1100,
            yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        }
      }
      g.fillStyle(here ? NUM.flameDeep : done ? NUM.flame : NUM.shadow, here ? 1 : .9);
      g.fillCircle(cx, y, r);
      g.lineStyle(here ? 3 : 2, here ? NUM.flameCore : done ? NUM.lantern : NUM.smoke, here || done ? 1 : .45);
      g.strokeCircle(cx, y, r);
      world.drawStationIcon(g, i, cx, y, r * .58, here || done ? NUM.parchment : NUM.smoke, here || done ? 1 : .55);
    }
    // Το όνομα του σταθμού μένει μόνο ως μικρή λεζάντα κάτω από το μετάλλιο
    const name = this.add.text(x0 + step * jr.station, y + 40, TXT.stations[jr.station], {
      fontFamily: FONT.ui, fontSize: '16px', color: HEX.lantern
    }).setOrigin(.5).setAlpha(.8).setDepth(45);
    name.setShadow(0, 0, HEX.shadow, 8, false, true);

    // Η ζώνη ΜΠΡΟΣΤΑ από τον Δρόμο (όπως στο HUD της μάχης): ο κύκλος του
    world.drawBelt(g, x0 - 62, y - 4, 1, journey.beltColor(jr.cycle));

    // Ζ4 (11/09 βράδυ): «κάτι στρογγυλά… είναι ξεκάθαρο τι είναι;» Όχι ήταν —
    // δυνάμεις, τεχνικές και ζώνη σε μία σειρά ίδιων κύκλων. Τώρα δύο
    // ΞΕΧΩΡΙΣΤΕΣ πλάκες, η καθεμιά με τη μικρή λεζάντα της:
    //   ΔΥΝΑΜΕΙΣ — όσες έχει αναμμένες· οι κλειδωμένες σβηστές με λουκέτο και
    //              το σύμβολο του σταθμού όπου ξεκλειδώνουν
    //   ΤΕΧΝΙΚΕΣ — δαχτυλίδι που γεμίζει όσο κατακτά λέξεις
    const y2 = 292, rr = 20, gap = 54;
    const unlocked = journey.unlockedPowers(jr.station, jr.cycle);
    const mastered = journey.masteredCount(who);
    const have = journey.unlockedPerks(mastered);
    const pw = gap * journey.POWERS.length + 10, kw = gap * journey.PERKS.length + 10;
    // Δεξιά από την παγόδα (φτάνει ως x ~545): εκεί ο ουρανός είναι άδειος
    const px0 = 590, kx0 = px0 + pw + 36;
    const plate = (x, w, label) => {
      g.fillStyle(NUM.night, .72);
      g.fillRoundedRect(x, y2 - 34, w, 68, 22);
      g.lineStyle(2, NUM.smoke, .3);
      g.strokeRoundedRect(x, y2 - 34, w, 68, 22);
      const t = this.add.text(x + w / 2, y2 + 48, label, {
        fontFamily: FONT.ui, fontSize: '17px', color: HEX.lantern
      }).setOrigin(.5).setAlpha(.75).setDepth(45);
      t.setShadow(0, 0, HEX.shadow, 8, false, true);
    };
    plate(px0, pw, TXT.powersLabel);
    plate(kx0, kw, TXT.perksLabel);

    let cx = px0 + 5 + gap / 2;
    for (const { id, at } of journey.POWERS) {
      const on = unlocked.includes(id);
      g.fillStyle(on ? NUM.flameDeep : NUM.shadow, on ? .95 : .7);
      g.fillCircle(cx, y2, rr);
      g.lineStyle(2.5, on ? NUM.flameCore : NUM.smoke, on ? .95 : .3);
      g.strokeCircle(cx, y2, rr);
      world.drawPowerIcon(g, id, cx, y2, rr * .6, on ? NUM.flameCore : NUM.nightHigh, on ? 1 : .9);
      if (!on) {                                   // λουκέτο + πού ξεκλειδώνει
        g.fillStyle(NUM.smoke, .9);
        g.fillRoundedRect(cx + 7, y2 + 6, 13, 10, 2);
        g.lineStyle(2, NUM.smoke, .9);
        g.beginPath(); g.arc(cx + 13.5, y2 + 6, 4.5, Math.PI, 0, false); g.strokePath();
        world.drawStationIcon(g, at, cx - 12, y2 + 12, 5.5, NUM.smoke, .8);
      }
      cx += gap;
    }
    cx = kx0 + 5 + gap / 2;
    for (const p of journey.PERKS) {
      const on = have.includes(p.id);
      const f = Math.min(1, mastered / p.need);
      g.fillStyle(on ? NUM.flame : NUM.shadow, on ? .9 : .6);
      g.fillCircle(cx, y2, rr);
      g.lineStyle(3.5, NUM.nightHigh, .95);
      g.strokeCircle(cx, y2, rr + 3);
      if (f > 0) {                                              // το δαχτυλίδι που γεμίζει
        g.lineStyle(3.5, on ? NUM.lantern : NUM.flame, 1);
        g.beginPath();
        g.arc(cx, y2, rr + 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f, false);
        g.strokePath();
      }
      world.drawPerkIcon(g, p.id, cx, y2, rr * .6, on ? NUM.flameCore : NUM.smoke, on ? 1 : .6);
      cx += gap;
    }
  }

  // ------------------------------------------------------- η φωτιά (κουμπί)

  buildBrazier(cx, baseY) {
    const g = this.add.graphics();
    g.fillStyle(NUM.stone, 1);
    g.fillPoints([
      new Phaser.Geom.Point(cx - 26, baseY), new Phaser.Geom.Point(cx + 26, baseY),
      new Phaser.Geom.Point(cx + 20, baseY - 22), new Phaser.Geom.Point(cx - 20, baseY - 22)
    ], true);
    g.fillPoints([
      new Phaser.Geom.Point(cx - 46, baseY - 46), new Phaser.Geom.Point(cx + 46, baseY - 46),
      new Phaser.Geom.Point(cx + 26, baseY - 20), new Phaser.Geom.Point(cx - 26, baseY - 20)
    ], true);
    g.fillStyle(NUM.ridgeMid, 1);
    g.fillRect(cx - 44, baseY - 44, 88, 5);
    g.fillStyle(NUM.flame, .7);
    g.fillRect(cx - 46, baseY - 48, 92, 4);
    g.fillStyle(NUM.flameDeep, .28);
    g.fillRect(cx - 40, baseY - 39, 80, 3);

    this.add.image(cx, baseY + 6, 'glow-flame')
      .setScale(2.6, .5).setAlpha(.22).setBlendMode(Phaser.BlendModes.ADD);

    const fy = baseY - 44;
    this.fireGlow = this.add.image(cx, fy - 40, 'glow-flame')
      .setScale(1.7).setAlpha(.55).setBlendMode(Phaser.BlendModes.ADD);
    this.fire = this.add.image(cx, fy, 'flame').setOrigin(.5, 1).setScale(.82);

    this.sparks = this.add.particles(cx, fy - 30, 'spark', {
      speed: { min: 8, max: 34 },
      angle: { min: 250, max: 290 },
      scale: { start: .55, end: 0 },
      alpha: { start: .95, end: 0 },
      lifespan: { min: 1300, max: 2700 },
      blendMode: 'ADD',
      tint: [NUM.flameCore, NUM.lantern, NUM.flame],
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(-20, -8, 40, 16) }
    });
    // Ρητά, μετά τη δημιουργία: το frequency μέσα στο config δεν εφαρμόζεται
    // αξιόπιστα και ο εκπομπός μένει σε λειτουργία «έκρηξης» (frequency -1).
    this.sparks.setFrequency(150, 1);
    this.sparks.start();

    if (!this.calm) {
      this.tweens.add({ targets: this.fire, scaleY: .89, scaleX: .79, angle: 1.6,
        duration: 780, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: this.fireGlow, alpha: .70, scale: 1.82,
        duration: 1150, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    this.hint = this.add.text(cx, 704, TXT.tapFlame, {
      fontFamily: FONT.ui, fontSize: '21px', color: HEX.smoke
    }).setOrigin(.5).setAlpha(.75);
    if (!this.calm) {
      this.tweens.add({ targets: this.hint, alpha: .35,
        duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    this.add.zone(cx, fy - 46, 190, 190).setOrigin(.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.igniteFlame());
  }

  igniteFlame() {
    if (this.leaving) return;
    this.leaving = true;
    audio.whoosh();
    // emitParticle, όχι explode: το explode γυρίζει τον εκπομπό σε μία βολή
    // και θα έσβηνε τις σπίθες που καίνε συνέχεια.
    this.sparks.emitParticle(30);
    this.tweens.add({ targets: this.fire, scaleX: 1.14, scaleY: 1.28,
      duration: 170, yoyo: true, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.fireGlow, alpha: 1, scale: 2.5,
      duration: 190, yoyo: true, ease: 'Quad.easeOut' });

    // Η φωτιά φουντώνει και μας παίρνει μαζί της στον δρόμο
    const flash = this.add.rectangle(W / 2, H / 2, W, H, NUM.flame)
      .setAlpha(0).setBlendMode(Phaser.BlendModes.ADD).setDepth(50);
    this.tweens.add({
      targets: flash, alpha: .55, duration: 380, ease: 'Quad.easeIn',
      onComplete: () => this.scene.start('Battle')
    });
  }

  // ------------------------------------------------------------ τίτλος & UI

  buildTitle() {
    const t = this.add.text(W / 2, 116, TXT.title, {
      fontFamily: FONT.ui, fontSize: '64px', fontStyle: '700', color: HEX.flameCore
    }).setOrigin(.5).setDepth(44);                  // πάνω από τη βινιέτα (40) — αλλιώς ξεθώριαζε
    t.setShadow(0, 0, HEX.flame, 30, false, true);
    if (!this.calm) {
      t.setAlpha(0).setY(96);
      this.tweens.add({ targets: t, alpha: 1, y: 116, duration: 1400, ease: 'Quad.easeOut' });
    }
  }

  buildOverlay() {
    world.buildVignette(this);
    const icon = this.add.text(W - 34, 34, '♪', {
      fontFamily: FONT.ui, fontSize: '28px', color: HEX.smoke
    }).setOrigin(.5).setAlpha(audio.muted ? .35 : .55).setDepth(45)
      .setInteractive({ useHandCursor: true });
    const bar = this.add.rectangle(W - 34, 34, 30, 2, NUM.smoke)
      .setAngle(-40).setAlpha(audio.muted ? .7 : 0).setDepth(46);
    icon.on('pointerdown', () => {
      const m = audio.toggleMute();
      bar.setAlpha(m ? .7 : 0);
      icon.setAlpha(m ? .35 : .55);
    });

    // Η ΠΡΑΓΜΑΤΙΚΗ έκδοση που σερβίρει το service worker αυτής της συσκευής.
    // Ήταν σταθερό «v0.5» και δεν έλεγε τίποτα· τώρα απαντά με μια ματιά στο
    // «πήρε το κινητό/ο υπολογιστής την αναβάθμιση;».
    const label = this.add.text(14, H - 20, window.__swVersion || '…', {
      fontFamily: FONT.ui, fontSize: '13px', color: HEX.smoke
    }).setAlpha(.22).setDepth(45);
    this.time.addEvent({
      delay: 600, repeat: 8,
      callback: () => label.setText(window.__swVersion || 'τοπικά')
    });

    // Ποιο προφίλ θα παίξει — μόνο όταν υπάρχουν πάνω από ένα. Αλλιώς ο
    // γονιός δεν ξέρει αν πατώντας τη φωτιά θα παίξει ο Σταύρος ή η «Δοκιμή».
    const st = store.loadState();
    const who = store.activeProfile(st);
    if (who && st.profiles.length > 1) {
      this.add.text(14, H - 42, who.profile.name, {
        fontFamily: FONT.ui, fontSize: '17px', color: HEX.smoke
      }).setAlpha(.6).setDepth(45);
    }

    // Πού βρίσκεται στον Δρόμο (NEXT-FIXES Ε3) — ο λόγος να ξαναπατήσει τη φωτιά
    if (who) this.buildDojoPanel(store.getJourney(st), who);
    if (who) this.buildShopButton(store.getSparks(st));
  }

  // Ο πάγκος του εμπόρου (Ζ11), μικρός, στην κάτω δεξιά γωνία — δεν χαλά την
  // εικόνα. Δείχνει και πόσες σπίθες έχει να ξοδέψει.
  buildShopButton(sparks) {
    const x = W - 88, y = H - 78;
    const c = this.add.container(x, y).setDepth(46);
    const g = this.add.graphics();
    g.fillStyle(NUM.night, .85);
    g.fillRoundedRect(-66, -58, 132, 118, 22);
    g.lineStyle(2, NUM.lantern, .5);
    g.strokeRoundedRect(-66, -58, 132, 118, 22);
    g.fillStyle(0x6B4E36, 1);
    g.fillRect(-38, -26, 5, 44); g.fillRect(33, -26, 5, 44);
    g.fillRoundedRect(-44, 6, 88, 20, 5);
    for (let i = 0; i < 5; i++) {
      g.fillStyle(i % 2 ? NUM.parchment : NUM.flameDeep, 1);
      g.fillRect(-45 + i * 18, -42, 18, 14);
      g.fillTriangle(-45 + i * 18, -28, -27 + i * 18, -28, -36 + i * 18, -20);
    }
    c.add([g,
      this.add.image(-14, 38, 'spark').setScale(.9).setBlendMode(Phaser.BlendModes.ADD),
      this.add.text(-2, 38, String(sparks), {
        fontFamily: FONT.ui, fontSize: '20px', fontStyle: '700', color: HEX.lantern
      }).setOrigin(0, .5)]);
    if (!this.calm) this.tweens.add({ targets: c, scale: 1.05, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.zone(x, y, 140, 126).setInteractive({ useHandCursor: true }).on('pointerdown', () => {
      if (this.leaving) return;
      audio.chime(0);
      this.userPaused = true;
      this.scene.launch('Shop', { from: 'Title' });
      this.scene.pause();
    });
  }
}
