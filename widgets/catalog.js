/* catalog — a filterable, searchable list of items (from jev-legal-research.html's idea
 * catalog and jev-beyond-classification.html's pattern atlas).
 *
 *   ```catalog {title="32 patterns" search=yes noun="patterns" empty="Nothing matches. Clear a filter."}
 *   Pattern | What it does | Family:group | Lever:facet {.all .pips order="Nearly free; Fast"} | Evidence:facet {.multi} | Sketch:detail | Breaks when:detail {.warn}
 *   Two-threshold funnel | Clear the confident yeses … | Cut a big set down | [Nearly free]{.cheap}, [Distributions]{.dist} | [Author-tested]{.ok} | One precise Noul … | A single 0.5 cutoff …
 *   ```
 * Columns: the first plain column is the item's title, the next plain one its summary.
 *   Name:group   group headings, in order of first appearance.
 *   Name:facet   a filter: one chip per value. A cell may hold several comma-separated values;
 *                each value's plain text is its filter key and its Markdown is how it shows, so
 *                [Nearly free]{.cheap} with a `colors: cheap=#…` topic gets that colour.
 *                Header classes: (none) one at a time, with an "All" chip · .multi any of the
 *                chosen values · .all every chosen value · .dot show the values as coloured dots
 *                · .pips a dot for every value, faded when absent · .hide filter only.
 *                order="A; B" puts those values first.
 *   Name:detail  a labelled section of the item's detail ({.warn} marks it as a caution).
 *   Name:code    a labelled code block; write line breaks as \n.
 * Attributes: .split lays it out as a list beside a detail panel (default: rows that expand,
 * grouped). search=yes adds a search box over every column. noun="ideas" names the count
 * ("Showing 4 of 11 ideas"); empty="…" is the message when nothing matches.
 * Without script the whole catalog reads as a list with every detail open; the runtime adds
 * the filters, the search and the expanding.
 */
import { firstTable, shell, cells, esc, cleanClass } from "../lib/wkit.js";
import { plain, parseAttrs } from "../lib/md.js";

const ROLE = /^(.*?):(facet|group|detail|code)$/;

/* "a, [b, c]{.x}, d" → ["a", "[b, c]{.x}", "d"]: commas inside [] () {} do not split */
function splitValues(s) {
  const out = [];
  let cur = "", depth = 0;
  for (const ch of String(s)) {
    if ("[({".includes(ch)) depth++;
    else if ("])}".includes(ch) && depth > 0) depth--;
    if (ch === "," && depth === 0) { if (cur.trim()) out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/* the topic colour a value names, if it is written [label]{.topic} */
function topicOf(v, ctx) {
  const m = String(v).match(/^\[([^\]]*)\]\{([^}]*)\}$/);
  if (!m) return "";
  return parseAttrs(m[2]).cls.map(cleanClass).find((c) => ctx.colors[c]) || "";
}

export const catalog = {
  render(b, ctx) {
    const t = firstTable(b.body);
    if (!t) { ctx.warn("catalog: needs a table (title, summary, then :facet, :group, :detail or :code columns)"); return ""; }
    const kv = b.a.kv, split = b.a.cls.includes("split");
    const n = t.cols.length;
    const cols = t.cols.map((c) => {
      const m = c.name.match(ROLE);
      const cls = ((c.a && c.a.cls) || []).map(cleanClass);
      return { name: m ? m[1].trim() : c.name, role: m ? m[2] : "text", cls, kv: (c.a && c.a.kv) || {} };
    });
    const textK = cols.map((c, k) => (c.role === "text" ? k : -1)).filter((k) => k >= 0);
    const titleK = textK[0], sumK = textK[1];
    if (titleK === undefined) { ctx.warn("catalog: needs a plain title column"); return ""; }
    const groupK = cols.findIndex((c) => c.role === "group");
    const facetK = cols.map((c, k) => (c.role === "facet" ? k : -1)).filter((k) => k >= 0);
    // plain columns after the summary read as details
    const detailK = cols.map((c, k) => ((c.role === "detail" || c.role === "code" || (c.role === "text" && k !== titleK && k !== sumK)) ? k : -1)).filter((k) => k >= 0);

    const rows = t.rows.map((r) => cells(r, n)).filter((c) => c[titleK].text.trim());
    if (!rows.length) { ctx.warn("catalog: the table has no rows"); return ""; }

    // facets: values in `order`, then in order of first appearance
    const facets = facetK.map((k) => {
      const c = cols[k];
      const mode = c.cls.includes("all") ? "all" : c.cls.includes("multi") ? "any" : "one";
      const show = c.cls.includes("hide") ? "hide" : c.cls.includes("pips") ? "pips" : c.cls.includes("dot") ? "dot" : "tags";
      const values = [], index = new Map();
      const add = (raw) => {
        const key = plain(raw).toLowerCase();
        if (!key) return -1;
        if (!index.has(key)) { index.set(key, values.length); values.push({ raw, label: plain(raw), topic: topicOf(raw, ctx) }); }
        return index.get(key);
      };
      const order = String(c.kv.order || "").split(";").map((s) => s.trim()).filter(Boolean);
      const rowVals = rows.map((r) => splitValues(r[k].text).map(add).filter((i) => i >= 0));
      if (order.length) {
        const rank = (v) => { const i = order.findIndex((o) => o.toLowerCase() === v.label.toLowerCase()); return i < 0 ? order.length : i; };
        const sorted = values.map((v, i) => ({ v, i })).sort((x, y) => rank(x.v) - rank(y.v) || x.i - y.i);
        const remap = new Map(sorted.map((s, ni) => [s.i, ni]));
        values.splice(0, values.length, ...sorted.map((s) => s.v));
        rowVals.forEach((rv, ri) => { rowVals[ri] = rv.map((i) => remap.get(i)); });
        for (const o of order) if (!values.some((v) => v.label.toLowerCase() === o.toLowerCase())) ctx.warn(`catalog: order names "${o}", which no row uses`);
      }
      return { k, name: c.name, mode, show, values, rowVals };
    });

    for (const k of [titleK, sumK]) {
      if (k !== undefined && rows.some((r) => /\]\(/.test(r[k].text))) ctx.warn(`catalog: a link in the "${cols[k].name}" column sits inside a button; put links in a :detail column`);
    }

    const dot = (v, extra = "") => `<i class="cat-pip${v.topic ? " c-" + esc(v.topic) : ""}${extra}" aria-hidden="true"></i>`;
    const dataF = (ri) => facets.map((f, g) => ` data-f${g}="${f.rowVals[ri].join(" ")}"`).join("");
    const markers = (ri, which) => facets.map((f) => {
      if (f.show === "hide") return "";
      const have = f.rowVals[ri];
      if (which === "lead" && f.show !== "dot" && f.show !== "pips") return "";
      if (which === "tail" && (f.show === "dot" || f.show === "pips") && split) return "";
      if (f.show === "pips" || f.show === "dot") {
        const shown = f.show === "pips" ? f.values.map((v, vi) => [v, have.includes(vi)]) : have.map((vi) => [f.values[vi], true]);
        const label = have.map((vi) => f.values[vi].label).join(", ") || "none";
        return `<span class="cat-pips" role="img" aria-label="${esc(f.name + ": " + label)}">` +
          shown.map(([v, on]) => `<i class="cat-pip${v.topic ? " c-" + esc(v.topic) : ""}${on ? "" : " off"}" title="${esc(v.label)}"></i>`).join("") + `</span>`;
      }
      return have.map((vi) => {
        const v = f.values[vi];
        return /[[*`=_]/.test(v.raw) ? `<span class="cat-tag">${ctx.inline(v.raw)}</span>` : `<span class="cat-tag plain">${esc(v.label)}</span>`;
      }).join("");
    }).join("");
    // every facet value in words, for the detail (dots get their label beside them)
    const meta = (ri) => facets.map((f) => f.rowVals[ri].map((vi) => {
      const v = f.values[vi];
      if (v.topic) return `<span class="cat-tag plain">${dot(v)}${esc(v.label)}</span>`;
      return /[[*`=_]/.test(v.raw) ? `<span class="cat-tag">${ctx.inline(v.raw)}</span>` : `<span class="cat-tag plain">${esc(v.label)}</span>`;
    }).join("")).join("");
    const sections = (r) => detailK.map((k) => {
      const c = cols[k], text = r[k].text;
      if (!text.trim()) return "";
      const head = `<h5>${ctx.inline(c.name)}</h5>`;
      if (c.role === "code") return `<div class="cat-sec">${head}<pre class="code"><code>${esc(text.replace(/\\n/g, "\n"))}</code></pre></div>`;
      return `<div class="cat-sec${c.cls.includes("warn") ? " cat-warn" : ""}">${head}<p>${ctx.inline(text)}</p></div>`;
    }).join("");

    // groups, in order of first appearance
    const groups = [];
    rows.forEach((r, ri) => {
      const g = groupK >= 0 ? r[groupK].text.trim() : "";
      let grp = groups.find((x) => x.name === g);
      if (!grp) { grp = { name: g, items: [] }; groups.push(grp); }
      grp.items.push(ri);
    });

    const noun = kv.noun || "items";
    let h = "";
    if (facets.length || kv.search === "yes") {
      h += `<div class="cat-filters" hidden>` + facets.map((f, g) => {
        const lab = ctx.uid("catf");
        return `<div class="cat-fg" role="group" aria-labelledby="${lab}"><span class="cat-fl" id="${lab}">${ctx.inline(f.name)}</span>` +
          (f.mode === "one" ? `<button type="button" class="cat-chip" data-g="${g}" data-v="all" aria-pressed="true">All</button>` : "") +
          f.values.map((v, vi) => `<button type="button" class="cat-chip" data-g="${g}" data-v="${vi}" aria-pressed="false">${v.topic ? dot(v) : ""}${esc(v.label)}</button>`).join("") +
          `</div>`;
      }).join("") +
      (kv.search === "yes" ? `<input type="search" class="cat-q" placeholder="Search ${esc(noun)}" aria-label="Search ${esc(noun)}">` : "") +
      `</div><p class="cat-count" aria-live="polite" hidden></p>`;
    }
    const empty = `<p class="cat-empty" hidden>${ctx.inline(kv.empty || "Nothing matches these filters. Clear one to see more.")}</p>`;

    if (split) {
      let idx = "", arts = "";
      groups.forEach((grp, gi) => {
        if (grp.name) idx += `<li class="cat-ih" data-grp="${gi}">${ctx.inline(grp.name)}</li>`;
        for (const ri of grp.items) {
          const r = rows[ri];
          idx += `<li class="cat-li" data-i="${ri}" data-grp="${gi}"${dataF(ri)}><button type="button" class="cat-pick" data-i="${ri}" aria-current="false">` +
            markers(ri, "lead") + `<span class="cat-nm">${ctx.inline(r[titleK].text)}</span>` +
            `<span class="cat-tags">${markers(ri, "tail")}</span></button></li>`;
          arts += `<article class="cat-art" data-i="${ri}"><h4 class="cat-at">${ctx.inline(r[titleK].text)}</h4>` +
            `<div class="cat-meta">${meta(ri)}</div>` +
            (sumK !== undefined && r[sumK].text ? `<p class="cat-lead">${ctx.inline(r[sumK].text)}</p>` : "") + sections(r) + `</article>`;
        }
      });
      h += `<div class="cat-split"><div class="cat-side" hidden><ul class="cat-index">${idx}</ul></div>` +
        `<div class="cat-panel" aria-live="polite">${arts}${empty}</div></div>`;
    } else {
      h += `<div class="cat-list">` + groups.map((grp, gi) => `<div class="cat-grp" data-grp="${gi}">` +
        (grp.name ? `<h4 class="cat-gh">${ctx.inline(grp.name)}</h4>` : "") +
        grp.items.map((ri) => {
          const r = rows[ri], id = ctx.uid("catd"), det = sections(r);
          const head = `<span class="cat-nm">${ctx.inline(r[titleK].text)}</span><span class="cat-tags">${markers(ri, "tail")}</span>` +
            (sumK !== undefined && r[sumK].text ? `<span class="cat-sum">${ctx.inline(r[sumK].text)}</span>` : "");
          return `<div class="cat-row"${dataF(ri)}>` + (det
            ? `<button type="button" class="cat-rb" aria-expanded="true" aria-controls="${id}">${head}<span class="cat-chev" aria-hidden="true"></span></button><div class="cat-det" id="${id}">${det}</div>`
            : `<div class="cat-rb">${head}</div>`) + `</div>`;
        }).join("") + `</div>`).join("") + `</div>` + empty;
    }

    const data = ` data-fm="${facets.map((f) => f.mode).join(" ")}" data-noun="${esc(noun)}"`;
    return shell("catalog", b, ctx, h, { cls: split ? "cat-is-split" : "cat-is-rows", data });
  },
};
