// Σταθερά μοναδικά IDs (ARCHITECTURE §7 — sync-ready).
export function newId() {
  if (globalThis.crypto && crypto.randomUUID) return crypto.randomUUID();
  // Fallback για πολύ παλιούς browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function now() {
  return new Date().toISOString();
}
