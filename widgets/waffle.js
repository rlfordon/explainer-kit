/* waffle — one square per item, coloured by category (from jev-beyond-classification.html's
 * census of 832 opinions). No script.
 *
 *   ```waffle {total=832 cols=52 seed=832 caption="One square per opinion screened."}
 *   Category | Count | Colour
 *   Low | rest | muted
 *   Uncertain | 113 | accent-soft
 *   Flagged | 23 | accent
 *   ```
 * A header row, then Label | count | colour. A count of `rest` takes whatever `total` leaves. Colours: ok, bad,
 * warn, accent, accent-soft, ink, muted, or a topic colour. Squares are scattered by `seed`
 * (the same picture on every load); .ordered fills them in row order instead. At most
 * 5,000 squares.
 */
import { firstTable, cells, esc, cleanClass } from "../lib/wkit.js";
import { rng } from "../lib/rand.js";

const COLOURS = { ok: "var(--ok)", bad: "var(--bad)", warn: "var(--warn)", accent: "var(--accent)", ink: "var(--ink)", muted: "var(--line-2)",
  "accent-soft": "color-mix(in srgb,var(--accent) 45%,var(--surface-2))" };
const MAX = 5000;

export const waffle = {
  render(b, ctx) {
    const t = firstTable(b.body);
    if (!t) { ctx.warn("waffle: needs a Label | count | colour table"); return ""; }
    const kv = b.a.kv;
    const cats = t.rows.map((r) => cells(r, 3)).map((c) => {
      const word = cleanClass(c[2].text);
      return { label: c[0].text, raw: c[1].text.trim(), colour: COLOURS[word] || (ctx.colors[word] ? "var(--c)" : ""), topic: !COLOURS[word] && ctx.colors[word] ? word : "" };
    });
    const fixed = cats.filter((c) => c.raw !== "rest").reduce((s, c) => s + (Math.max(0, Math.round(Number(c.raw))) || 0), 0);
    let total = Math.round(Number(kv.total));
    if (!Number.isFinite(total) || total <= 0) total = fixed;
    if (total > MAX) { ctx.warn(`waffle: at most ${MAX} squares`); total = MAX; }
    if (fixed > total) ctx.warn("waffle: the counts add up to more than total");
    cats.forEach((c, i) => {
      c.n = c.raw === "rest" ? Math.max(0, total - fixed) : Math.max(0, Math.round(Number(c.raw))) || 0;
      if (!c.colour) c.colour = ["var(--line-2)", COLOURS["accent-soft"], "var(--accent)", "var(--warn)", "var(--ok)"][i % 5];
    });
    // one category index per square; scattered by a seeded shuffle unless .ordered
    const cells_ = [];
    cats.forEach((c, i) => { for (let k = 0; k < c.n && cells_.length < total; k++) cells_.push(i); });
    while (cells_.length < total) cells_.push(-1);
    if (!b.a.cls.includes("ordered")) {
      const r = rng(Number(kv.seed) || 1);
      for (let i = cells_.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [cells_[i], cells_[j]] = [cells_[j], cells_[i]]; }
    }
    const cols = Math.min(Math.max(Math.round(Number(kv.cols)) || Math.ceil(Math.sqrt(total * 3)), 4), 120);
    const rowsN = Math.ceil(total / cols);
    const label = cats.map((c) => `${c.n} ${c.label}`).join(", ");
    const sq = cells_.map((ci) => `<i${ci >= 0 ? ` class="k${ci}"` : ""}></i>`).join("");
    const keyStyle = cats.map((c, i) => `--k${i}:${c.colour}`).join(";");
    const topicCls = cats.map((c) => (c.topic ? " c-" + esc(c.topic) : "")).join("");
    return `<figure class="waffle${topicCls}" style="${keyStyle}">` +
      `<div class="wf-grid" role="img" aria-label="${esc(total + " squares: " + label)}" style="grid-template-columns:repeat(${cols},minmax(0,1fr));grid-template-rows:repeat(${rowsN},auto)">${sq}</div>` +
      `<figcaption>${kv.caption ? `<span>${ctx.inline(kv.caption)}</span>` : ""}<span class="wf-key">${cats.map((c, i) => `<span><i class="k${i}"></i>${ctx.inline(c.label)}</span>`).join("")}</span></figcaption></figure>`;
  },
};
