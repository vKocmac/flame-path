// Παλέτα — η μοναδική πηγή χρώματος για ΟΛΟ το παιχνίδι (DESIGN.md).
// Το στρώμα θέματος: αλλάζοντας αυτό το αρχείο αλλάζει ο κόσμος, όχι η λογική.

export const HEX = {
  // Ο κόσμος
  night: '#141A33',
  nightHigh: '#232A4D',
  shadow: '#0B0E1F',
  // Στρώσεις τοπίου (θέατρο σκιών: όσο πιο μπροστά, τόσο πιο σκούρο).
  // Κλίμακα δεμένη στην παλέτα του DESIGN: ridgeFar = nightHigh,
  // ground = shadow· τα ενδιάμεσα παρεμβάλλονται ανάμεσά τους.
  skyTop: '#1D2445',
  skyMid: '#171D3A',
  skyLow: '#101427',
  ridgeHaze: '#2C3560',
  ridgeFar: '#232A4D',
  ridgeMid: '#1A2142',
  ridgeNear: '#12172E',
  ground: '#0B0E1F',
  dojoBody: '#0D1228',
  dojoRoof: '#080B1C',
  stone: '#1B2140',
  path: '#171C36',
  // Η φωτιά
  lantern: '#FFC857',
  flame: '#FF7A1A',
  flameCore: '#FFE8A3',
  flameDeep: '#E8491D',
  // Οι λέξεις
  parchment: '#F6EAD2',
  ink: '#2B2117',
  // Λοιπά
  spirit: '#57C7B8',
  smoke: '#7C86A0',
  moon: '#E9E6F2',
  star: '#C9CFEA'
};

// Ίδια χρώματα ως αριθμοί, για το Phaser.
export const NUM = Object.fromEntries(
  Object.entries(HEX).map(([k, v]) => [k, parseInt(v.slice(1), 16)])
);

// '#FF7A1A' + 0.4 → 'rgba(255,122,26,0.4)' (για canvas gradients)
export function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export const FONT = {
  ui: 'Comfortaa, "Segoe UI", sans-serif',
  word: 'Andika, "Segoe UI", sans-serif'
};
