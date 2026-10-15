/* splits — debug a label set from its own distributions: which categories keep splitting the
 * top two places, and which never win (from jev-beyond-classification.html's taxonomy debugger).
 *
 *   ```splits {title="…" margin=0.2 margin-range="0.05 0.5" seed=7 escape=None note="…"}
 *   categories: Follows, Applies, Distinguishes, Limits, Criticizes, None
 *   28: Follows 0.3+0.3, Applies 0.25+0.3 / Applies 0.3+0.3, Follows 0.25+0.3
 *   14: Distinguishes 0.5+0.3, Limits 0.1+0.25
 *   fix Merge Follows + Applies: Follows, Applies -> Relies on
 *   fix Fold Criticizes into Limits: Criticizes -> Limits
 *   ```
 * Each "N: …" line makes N synthetic items. Every category starts with noise of 0.01 to 0.04;
 * "Cat a+b" then adds a plus up to b, and the item is normalised to sum to 1. Alternatives
 * separated by " / " are picked at random per item. Generation is seeded (`seed`), so the
 * numbers are the same on every load. A "fix" line is a button that merges its sources into
 * the target: an existing category absorbs them; a new name replaces the first source.
 * `margin`: an item counts as a split when its top two are within it (a slider over
 * `margin-range`). `escape`: the catch-all category, never called dead. Optional:
 * `margin-label`, `note`.
 */
import { shell, esc } from "../lib/wkit.js";
import { plain } from "../lib/md.js";

const MAX_CATS = 40, MAX_ITEMS = 2000, MAX_ALTS = 10, MAX_FIXES = 12;

function num(s, def, lo, hi) {
  const v = Number(s);
  return Number.isFinite(v) && v >= lo && v <= hi ? v : def;
}
const name = (s) => plain(s).replace(/\s+/g, " ").trim().slice(0, 60);

export const splits = {
  render(b, ctx) {
    const kv = (b.a && b.a.kv) || {};
    let cats = [];
    const groups = [], fixes = [];
    let total = 0;
    for (const raw of String(b.body).split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      let m = line.match(/^categories\s*:\s*(.+)$/i);
      if (m) {
        cats = m[1].split(",").map(name).filter(Boolean);
        if (new Set(cats).size !== cats.length) ctx.warn("splits: a category is listed twice");
        if (cats.length > MAX_CATS) { ctx.warn(`splits: more than ${MAX_CATS} categories`); cats = cats.slice(0, MAX_CATS); }
        continue;
      }
      m = line.match(/^fix\s+(.+?)\s*:\s*(.+?)\s*(?:->|→)\s*(.+)$/i);
      if (m) {
        if (fixes.length >= MAX_FIXES) { ctx.warn(`splits: more than ${MAX_FIXES} fixes`); continue; }
        fixes.push({ label: m[1], from: m[2].split(",").map(name).filter(Boolean), to: name(m[3]) });
        continue;
      }
      m = line.match(/^(\d+)\s*[:×x]\s*(.+)$/);
      if (m) {
        const n = Number(m[1]);
        const alts = m[2].split(/\s+\/\s+/).slice(0, MAX_ALTS).map((alt) => alt.split(",").map((e) => {
          const em = e.trim().match(/^(.+?)\s+(\d*\.?\d+)\s*(?:\+\s*(\d*\.?\d+))?$/);
          if (!em) { ctx.warn(`splits: "${e.trim().slice(0, 30)}" should be "Category a+b"`); return null; }
          return [name(em[1]), num(em[2], 0, 0, 10), num(em[3] ?? 0, 0, 0, 10)];
        }).filter(Boolean));
        if (total + n > MAX_ITEMS) { ctx.warn(`splits: more than ${MAX_ITEMS} items`); continue; }
        total += n;
        groups.push({ n, alts });
        continue;
      }
      ctx.warn(`splits: "${line.slice(0, 40)}" is not a categories:, "N:" or fix line`);
    }
    if (cats.length < 2 || !groups.length) { ctx.warn("splits: needs a categories: line with two or more names and at least one \"N:\" line"); return ""; }
    for (const g of groups) for (const alt of g.alts) for (const e of alt) {
      if (!cats.includes(e[0])) ctx.warn(`splits: "${e[0]}" is not in categories:`);
    }
    const known = new Set(cats);
    for (const f of fixes) {
      for (const s of f.from) if (!known.has(s)) ctx.warn(`splits: fix "${plain(f.label)}" names "${s}", which is not a category`);
      if (!f.to || !f.from.length) ctx.warn(`splits: fix "${plain(f.label)}" needs sources and a target`);
      known.add(f.to);
    }
    const escape = kv.escape ? name(kv.escape) : "";
    if (escape && !cats.includes(escape)) ctx.warn(`splits: escape "${escape}" is not a category`);

    const range = String(kv["margin-range"] || "").split(/\s+/).map(Number);
    const lo = range.length === 2 && range.every(Number.isFinite) && range[0] >= 0 && range[1] <= 1 && range[0] < range[1] ? range[0] : 0.05;
    const hi = lo === range[0] ? range[1] : 0.5;
    const margin = Math.min(hi, Math.max(lo, num(kv.margin, 0.2, 0, 1)));
    const spec = {
      cats, seed: Math.trunc(num(kv.seed, 1, -2147483648, 2147483647)), escape,
      groups: groups.map((g) => ({ n: g.n, alts: g.alts.map((a) => a.filter((e) => cats.includes(e[0]))) })),
      fixes: fixes.map((f) => ({ from: f.from, to: f.to })),
    };

    const sid = ctx.uid("sp");
    let side = `<div class="sp-ctrl"><label for="${sid}"><span>${ctx.inline(kv["margin-label"] || "Count as a split when top two are within")}</span> <output>${margin.toFixed(2)}</output></label>` +
      `<input type="range" id="${sid}" class="sp-margin" min="${lo}" max="${hi}" step="0.01" value="${margin}"></div>`;
    if (fixes.length) {
      side += `<div class="sp-fixes">` + fixes.map((f, i) => `<button type="button" class="btn btn-primary sp-fix" data-i="${i}">${ctx.inline(f.label)}</button>`).join("") +
        `<button type="button" class="btn btn-ghost sp-reset">Reset</button></div>`;
    }
    side += `<ul class="sp-find" aria-live="polite"></ul>`;
    if (kv.note) side += `<p class="note sp-note">${ctx.inline(kv.note)}</p>`;
    const main = `<div class="sp-mxwrap"><div class="sp-mx" role="table" aria-label="Pairwise split counts between categories"></div></div>` +
      `<div class="sp-wins"></div>` +
      `<p class="sp-static">${esc(total)} synthetic items over ${cats.length} categories: ${cats.map((c) => esc(c)).join(", ")}.</p>`;
    return shell("splits", b, ctx,
      `<div class="sp" data-spec="${esc(JSON.stringify(spec))}"><div class="sp-side">${side}</div><div class="sp-main">${main}</div></div>`);
  },
};
