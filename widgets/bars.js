/* bars — horizontal bars, or one stacked bar, from a Label | Value table (from the
 * jev-legal-research.html charts and its "one decision" probability bars). No script.
 *
 *   ```bars {title="Share each citator missed" caption="Hellyer (2018), 309 relationships." max=100}
 *   Citator | Missed
 *   Shepard's | 33%
 *   KeyCite | 38%
 *   BCite | 72% {.bad}
 *   ```
 * The value shows as written; its number sets the length, against `max` (default: 100 when
 * every value ends in %, else the largest value). A colour class on the value cell (ok, bad,
 * warn, accent, muted, or a topic colour) colours that bar. Fence classes: .stack (one bar,
 * split in proportion, with a legend), .peak (highlight the largest bar), .compact.
 */
import { firstTable, cells, esc, cleanClass } from "../lib/wkit.js";

const COLOURS = { ok: "var(--ok)", bad: "var(--bad)", warn: "var(--warn)", accent: "var(--accent)", muted: "var(--ink-3)", ink: "var(--ink-2)" };
const STACK = ["var(--accent)", "color-mix(in srgb,var(--accent) 60%,var(--surface-2))", "color-mix(in srgb,var(--accent) 30%,var(--surface-2))", "var(--ink-3)", "var(--warn)", "var(--ok)"];

function numOf(s) {
  const m = String(s).replace(/,/g, "").match(/-?\d*\.?\d+(?:e[+-]?\d+)?/i);
  return m ? Number(m[0]) : NaN;
}

export const bars = {
  render(b, ctx) {
    const t = firstTable(b.body);
    if (!t) { ctx.warn("bars: needs a Label | Value table"); return ""; }
    const kv = b.a.kv, cls = b.a.cls;
    const rows = t.rows.map((r) => cells(r, 2)).map((c) => ({ label: c[0].text, text: c[1].text, v: numOf(c[1].text), a: c[1].a || c[0].a }))
      .filter((r) => { if (!Number.isFinite(r.v) || r.v < 0) { ctx.warn(`bars: "${r.text}" has no number`); return false; } return true; });
    if (!rows.length) return "";
    const colourOf = (r, i, stack) => {
      const c = ((r.a && r.a.cls) || []).map(cleanClass).find((x) => COLOURS[x] || ctx.colors[x]);
      if (c && COLOURS[c]) return { style: `--bc:${COLOURS[c]}`, cls: "" };
      if (c) return { style: "--bc:var(--c)", cls: ` c-${esc(c)}` };
      return { style: stack ? `--bc:${STACK[i % STACK.length]}` : "", cls: "" };
    };
    const head = kv.title ? `<p class="bars-t">${ctx.inline(kv.title)}</p>` : "";
    const cap = kv.caption ? `<p class="bars-cap">${ctx.inline(kv.caption)}</p>` : "";
    const extra = cls.filter((c) => ["compact"].includes(c)).map((c) => " " + c).join("");
    if (cls.includes("stack")) {
      const sum = rows.reduce((s, r) => s + r.v, 0) || 1;
      const segs = rows.map((r, i) => { const c = colourOf(r, i, true); return `<i class="${c.cls.trim()}" style="${c.style};width:${(r.v / sum * 100).toFixed(2)}%"></i>`; }).join("");
      const legend = rows.map((r, i) => { const c = colourOf(r, i, true); return `<span class="${c.cls.trim()}" style="${c.style}">${ctx.inline(r.label)}, ${ctx.inline(r.text)}</span>`; }).join("");
      const label = rows.map((r) => `${r.label} ${r.text}`).join(", ");
      return `<figure class="bars stacked${extra}">${head}<div class="bars-stack" role="img" aria-label="${esc(label)}">${segs}</div><div class="bars-legend">${legend}</div>${cap}</figure>`;
    }
    const pctAll = rows.every((r) => /%\s*$/.test(r.text));
    const max = Number.isFinite(numOf(kv.max)) && numOf(kv.max) > 0 ? numOf(kv.max) : pctAll ? 100 : Math.max(...rows.map((r) => r.v)) || 1;
    const top = Math.max(...rows.map((r) => r.v));
    const body = rows.map((r, i) => {
      const c = colourOf(r, i, false), peak = cls.includes("peak") && r.v === top;
      return `<div class="bar${peak ? " peak" : ""}${c.cls}"${c.style ? ` style="${c.style}"` : ""}><span class="bl">${ctx.inline(r.label)}</span>` +
        `<span class="bt"><i style="width:${Math.min(100, r.v / max * 100).toFixed(2)}%"></i></span><b>${ctx.inline(r.text)}</b></div>`;
    }).join("");
    return `<figure class="bars${extra}">${head}${body}${cap}</figure>`;
  },
};
