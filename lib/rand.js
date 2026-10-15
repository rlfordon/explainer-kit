/* rand.js — seeded randomness for widgets whose data is generated (synthetic demos) or
 * scattered (waffle squares, dot jitter), so a page looks the same on every load. The
 * generator is mulberry32, the one html-explainer's pages use, so the same seed gives the
 * same numbers as the original demo. No DOM, no Node. */

export function rng(seed) {
  seed = Number(seed) | 0;
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* a standard normal draw (Box–Muller) from a generator */
export function gauss(r) {
  let u = 0, v = 0;
  while (!u) u = r();
  while (!v) v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* a stable 0–1 value for an index, for jitter that does not depend on draw order */
export function jitter(i, seed = 1) {
  return rng((i + 1) * 2654435761 ^ seed)();
}
