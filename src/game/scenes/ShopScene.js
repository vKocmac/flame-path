// Ο Πάγκος του Εμπόρου — το κατάστημα (NEXT-FIXES Ζ11, απόφαση 11/09).
// Ανοίγει από τον τίτλο (κουμπί) και από τον χάρτη του Δρόμου (ο έμπορος
// ανάμεσα στους σταθμούς). Η σκηνή από κάτω ΠΑΓΩΝΕΙ όσο είναι ανοιχτό.
//
// Για παιδί 8 χρονών: άγγιγμα σε κάρτα = τη ΔΙΑΛΕΓΕΙ (φαίνεται μεγάλη δεξιά,
// με τι κάνει και πόσο κοστίζει)· η αγορά θέλει δεύτερο, ξεχωριστό άγγιγμα
// στο «Αγόρασε». Ένα τυχαίο άγγιγμα δεν ξοδεύει ποτέ σπίθες.

import { NUM, HEX, FONT } from '../../theme/palette.js';
import { TXT } from '../../theme/strings.js';
import * as audio from '../../theme/audio.js';
import * as store from '../../shared/storage.js';
import * as world from '../world.js';
import { SHOP, CATS, status } from '../shop.js';

const W = 1280, H = 720;
const ROW_Y = [178, 310, 442, 574];
const CARD_W = 128, CARD_H = 112, CARD_X0 = 250, CARD_STEP = 146;

export default class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }

  init(data) {
    this.from = (data && data.from) || 'Title';
  }

  create() {
    this.leaving = false;
    this.selected = null;
    this.add.rectangle(W / 2, H / 2, W, H, NUM.shadow).setAlpha(.97).setInteractive();   // τα αγγίγματα δεν περνούν από κάτω

    const title = this.add.text(W / 2, 58, TXT.shopTitle, {
      fontFamily: FONT.ui, fontSize: '40px', fontStyle: '700', color: HEX.flameCore
    }).setOrigin(.5);
    title.setShadow(0, 0, HEX.flame, 18, false, true);
    // Ο πάγκος: τέντα με ρίγες πάνω από τον τίτλο
    const awn = this.add.graphics();
    for (let i = 0; i < 12; i++) {
      awn.fillStyle(i % 2 ? NUM.flameDeep : NUM.parchment, i % 2 ? .9 : .8);
      awn.fillRect(W / 2 - 300 + i * 50, 0, 50, 18);
      awn.fillTriangle(W / 2 - 300 + i * 50, 18, W / 2 - 250 + i * 50, 18, W / 2 - 275 + i * 50, 30);
    }

    // Οι σπίθες του, μεγάλες, πάνω δεξιά
    this.add.image(W - 150, 58, 'spark').setScale(1.8).setBlendMode(Phaser.BlendModes.ADD);
    this.sparkText = this.add.text(W - 124, 58, '', {
      fontFamily: FONT.ui, fontSize: '36px', fontStyle: '700', color: HEX.lantern
    }).setOrigin(0, .5);

    // ‹ κλείσιμο
    const back = this.add.graphics({ x: 44, y: 58 });
    back.fillStyle(NUM.night, 1); back.fillCircle(0, 0, 28);
    back.lineStyle(2.5, NUM.smoke, .7); back.strokeCircle(0, 0, 28);
    back.lineStyle(5, NUM.parchment, .9);
    back.strokePoints([new Phaser.Geom.Point(6, -12), new Phaser.Geom.Point(-6, 0), new Phaser.Geom.Point(6, 12)]);
    this.add.zone(44, 58, 76, 76).setInteractive({ useHandCursor: true }).on('pointerdown', () => this.close());

    CATS.forEach((cat, r) => {
      this.add.text(40, ROW_Y[r], TXT.shopCats[cat], {
        fontFamily: FONT.ui, fontSize: '22px', fontStyle: '700', color: HEX.parchment
      }).setOrigin(0, .5).setAlpha(.85);
    });

    this.cards = this.add.container(0, 0);
    this.detail = this.add.container(0, 0);
    this.render();
  }

  state() {
    const st = store.loadState();
    return { st, shop: store.getShop(st), sparks: store.getSparks(st) };
  }

  render() {
    const { shop, sparks } = this.state();
    this.sparkText.setText(String(sparks));
    this.cards.removeAll(true);
    CATS.forEach((cat, r) => {
      SHOP.filter((x) => x.cat === cat).forEach((it, i) => {
        const x = CARD_X0 + i * CARD_STEP, y = ROW_Y[r];
        const s = status(it, shop, sparks);
        const wearing = (it.cat === 'ribbon' && shop.ribbon === it.id) || (it.cat === 'mask' && s === 'owned');
        const sel = this.selected === it.id;
        const g = this.add.graphics();
        g.fillStyle(sel ? NUM.nightHigh : NUM.night, 1);
        g.fillRoundedRect(x - CARD_W / 2, y - CARD_H / 2, CARD_W, CARD_H, 16);
        g.lineStyle(sel ? 4 : 2, sel ? NUM.flameCore : (s === 'owned' ? NUM.lantern : NUM.smoke), sel ? 1 : (s === 'owned' ? .9 : .35));
        g.strokeRoundedRect(x - CARD_W / 2, y - CARD_H / 2, CARD_W, CARD_H, 16);
        const dim = s === 'locked' ? .3 : s === 'poor' ? .6 : 1;
        world.drawShopIcon(g, it, x, y - 14, 30, dim);
        this.cards.add(g);
        if (s === 'owned') {                              // ✓ ή «το φοράς»
          const b = this.add.graphics({ x: x + CARD_W / 2 - 18, y: y - CARD_H / 2 + 18 });
          b.fillStyle(wearing ? NUM.flame : NUM.lantern, 1); b.fillCircle(0, 0, 13);
          b.lineStyle(3.5, NUM.shadow, 1);
          b.strokePoints([new Phaser.Geom.Point(-6, 0), new Phaser.Geom.Point(-1, 5), new Phaser.Geom.Point(7, -5)]);
          this.cards.add(b);
        } else if (s === 'locked') {                      // λουκέτο
          const b = this.add.graphics({ x, y: y - 14 });
          b.fillStyle(NUM.smoke, .95); b.fillRoundedRect(-11, -4, 22, 17, 3);
          b.lineStyle(3, NUM.smoke, .95); b.beginPath(); b.arc(0, -4, 7, Math.PI, 0, false); b.strokePath();
          this.cards.add(b);
        }
        if (s !== 'owned') {                              // η τιμή
          this.cards.add(this.add.image(x - 22, y + 36, 'spark').setScale(.8).setAlpha(dim)
            .setBlendMode(Phaser.BlendModes.ADD));
          this.cards.add(this.add.text(x - 10, y + 36, String(it.price), {
            fontFamily: FONT.ui, fontSize: '20px', fontStyle: '700', color: s === 'poor' ? HEX.smoke : HEX.lantern
          }).setOrigin(0, .5).setAlpha(s === 'locked' ? .4 : 1));
        }
        const z = this.add.zone(x, y, CARD_W, CARD_H).setInteractive({ useHandCursor: true });
        z.on('pointerdown', () => { this.selected = it.id; audio.chime(0); this.render(); });
        this.cards.add(z);
      });
    });
    this.renderDetail(shop, sparks);
  }

  // Δεξιά: το είδος που διάλεξε, μεγάλο, με το τι κάνει και το κουμπί
  renderDetail(shop, sparks) {
    this.detail.removeAll(true);
    const x0 = 880, w = 360;
    const g = this.add.graphics();
    g.fillStyle(NUM.night, .9);
    g.fillRoundedRect(x0, 120, w, 520, 24);
    g.lineStyle(2, NUM.smoke, .3);
    g.strokeRoundedRect(x0, 120, w, 520, 24);
    this.detail.add(g);
    const it = SHOP.find((x) => x.id === this.selected);
    const cx = x0 + w / 2;
    if (!it) {
      // Τίποτα διαλεγμένο: ο νίντζα με ό,τι φορά
      this.detail.add(this.add.text(cx, 380, '←', { fontFamily: FONT.ui, fontSize: '54px', color: HEX.smoke }).setOrigin(.5).setAlpha(.5));
      return;
    }
    const [name, desc] = TXT.shopItems[it.id] || [it.id, ''];
    const big = this.add.graphics();
    world.drawShopIcon(big, it, cx, 250, 80, 1);
    this.detail.add(big);
    this.detail.add(this.add.text(cx, 372, name, {
      fontFamily: FONT.ui, fontSize: '26px', fontStyle: '700', color: HEX.flameCore, align: 'center', wordWrap: { width: w - 40 }
    }).setOrigin(.5));
    this.detail.add(this.add.text(cx, 420, desc, {
      fontFamily: FONT.ui, fontSize: '19px', color: HEX.parchment, align: 'center', wordWrap: { width: w - 50 }
    }).setOrigin(.5, 0).setAlpha(.9));
    if (it.cat === 'mask') {
      this.detail.add(this.add.text(cx, 470, TXT.maskNote, {
        fontFamily: FONT.ui, fontSize: '16px', color: HEX.smoke, align: 'center', wordWrap: { width: w - 50 }
      }).setOrigin(.5, 0));
    }
    const s = status(it, shop, sparks);
    const canWear = it.cat === 'ribbon' && s === 'owned' && shop.ribbon !== it.id;
    const label = s === 'ok' ? `${TXT.buy}  ✦ ${it.price}` : canWear ? TXT.wear
      : s === 'owned' ? ((it.cat === 'ribbon' || it.cat === 'mask') ? TXT.wearing : TXT.owned)
      : s === 'locked' ? TXT.locked : TXT.poor;
    const active = s === 'ok' || canWear;
    const bg = this.add.graphics();
    bg.fillStyle(active ? NUM.flameDeep : NUM.nightHigh, 1);
    bg.fillRoundedRect(cx - 140, 560, 280, 58, 29);
    if (active) { bg.lineStyle(3, NUM.flameCore, 1); bg.strokeRoundedRect(cx - 140, 560, 280, 58, 29); }
    this.detail.add(bg);
    this.detail.add(this.add.text(cx, 589, label, {
      fontFamily: FONT.ui, fontSize: label.length > 16 ? '18px' : '22px', fontStyle: '700', color: active ? HEX.flameCore : HEX.smoke
    }).setOrigin(.5));
    if (!active) return;
    const z = this.add.zone(cx, 589, 280, 58).setInteractive({ useHandCursor: true });
    z.on('pointerdown', () => this.act(it, canWear));
    this.detail.add(z);
  }

  act(it, wear) {
    const st = store.loadState();
    if (wear) {
      store.wearRibbon(st, it.id);
      audio.chime(1);
    } else {
      if (!store.buyItem(st, it)) return;
      audio.cast();
      [0, 1, 2, 3].forEach((k) => this.time.delayedCall(k * 90, () => audio.chime(k)));
      // λάμψη πάνω στη μεγάλη εικόνα
      const f = this.add.image(1060, 250, 'glow-lantern').setScale(.6).setAlpha(1).setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: f, scale: 2.4, alpha: 0, duration: 600, onComplete: () => f.destroy() });
    }
    this.render();
  }

  close() {
    if (this.leaving) return;
    this.leaving = true;
    const from = this.scene.get(this.from);
    if (from) from.userPaused = false;
    if (this.from === 'Battle') {
      if (from && from.applyGear) from.applyGear();
      this.scene.resume('Battle');
    } else {
      this.scene.resume('Title');
      if (from) from.scene.restart();       // ο ήρωας του τίτλου με ό,τι αγόρασε
    }
    this.scene.stop();
  }
}
