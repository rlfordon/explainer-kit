/* static.js — the widgets that need no script: cards, stats, callout, deeper, myths, glossary.
 *
 *   ```cards {.mono}         Tag | Text                 (hero cards; a {.topic} on the tag colours it)
 *   ```cards {.rule}         Kicker | Title | Text      (the last column is the text, the one before it the title)
 *   ```stats {.big-first}     Label | Value              (.big-first: the value big, the label under it)
 *   ```callout {kind=note|key|warn title="…"}   Markdown body
 *   ```deeper {title="Go deeper: …"}             Markdown body, folded
 *   ```myths {said="Commonly said" fix="Actually"}
 *     - The claim, as people say it.
 *       > The correction. Blank > lines separate paragraphs.
 *   ```glossary {.grid}      Term | Meaning
 */
import { firstTable, firstList, cells, topicOf, esc, cleanClass, quoteParas } from "../lib/wkit.js";

function extraCls(b) { return ((b.a && b.a.cls) || []).map(cleanClass).filter(Boolean); }

export const cards = {
  render(b, ctx) {
    const t = firstTable(b.body);
    if (!t) { ctx.warn("cards: needs a table"); return ""; }
    const n = t.cols.length, x = extraCls(b);
    const items = t.rows.map((row) => {
      const c = cells(row, n);
      const topic = topicOf(c[0].a, ctx) || topicOf(c[n - 1].a, ctx);
      const body = ctx.inline(c[n - 1].text);
      const title = n >= 2 ? ctx.inline(c[n - 2].text) : "";
      const kicker = n >= 3 ? ctx.inline(c[0].text) : "";
      return `<div class="card${topic ? " c-" + topic : ""}">${kicker ? `<div class="kicker">${kicker}</div>` : ""}` +
        (title ? `<div class="ct">${title}</div>` : "") + `<div class="cb">${body}</div></div>`;
    }).join("");
    const cols = Math.min(4, t.rows.length || 1);
    return `<div class="cards ${x.join(" ")}" style="--n:${cols}">${items}</div>`;
  },
};

export const stats = {
  render(b, ctx) {
    const t = firstTable(b.body);
    if (!t) { ctx.warn("stats: needs a Label | Value table"); return ""; }
    return `<div class="stats ${extraCls(b).join(" ")}">` + t.rows.map((row) => {
      const c = cells(row, 2);
      return `<div class="stat"><div class="sl">${ctx.inline(c[0].text)}</div><div class="sv">${ctx.inline(c[1].text)}</div></div>`;
    }).join("") + `</div>`;
  },
};

export const callout = {
  render(b, ctx) {
    const kv = (b.a && b.a.kv) || {};
    const kind = ["note", "key", "warn", "flag"].includes(kv.kind) ? kv.kind : "note";
    return `<aside class="callout k-${kind} ${extraCls(b).join(" ")}">` +
      (kv.title ? `<p class="callout-t">${ctx.inline(kv.title)}</p>` : "") + ctx.markdown(b.body) + `</aside>`;
  },
};

export const deeper = {
  render(b, ctx) {
    const kv = (b.a && b.a.kv) || {};
    return `<details class="deeper ${extraCls(b).join(" ")}"${kv.open === "yes" ? " open" : ""}><summary>${ctx.inline(kv.title || "Go deeper")}</summary>` +
      `<div class="dbody">${ctx.markdown(b.body)}</div></details>`;
  },
};

export const myths = {
  render(b, ctx) {
    const kv = (b.a && b.a.kv) || {};
    const l = firstList(b.body);
    if (!l) { ctx.warn("myths: needs a list of claims, each with a > correction"); return ""; }
    const said = esc(kv.said || "Commonly said"), fix = esc(kv.fix || "Actually");
    return `<div class="miscon ${extraCls(b).join(" ")}">` + l.items.map((it) => {
      const paras = quoteParas(it.quote).concat(it.paras);
      if (!paras.length) ctx.warn(`myths: "${it.text.slice(0, 40)}" has no correction (add a > line)`);
      return `<div class="mis"><div class="claim"><span class="lab bad">${said}</span>${ctx.inline(it.text)}</div>` +
        `<div class="fix"><span class="lab good">${fix}</span>${ctx.paras(paras)}</div></div>`;
    }).join("") + `</div>`;
  },
};

export const glossary = {
  render(b, ctx) {
    const t = firstTable(b.body);
    if (!t) { ctx.warn("glossary: needs a Term | Meaning table"); return ""; }
    return `<dl class="gloss ${extraCls(b).join(" ")}">` + t.rows.map((row) => {
      const c = cells(row, 2);
      return `<div class="gi"><dt>${ctx.inline(c[0].text)}</dt><dd>${ctx.inline(c[1].text)}</dd></div>`;
    }).join("") + `</dl>`;
  },
};
