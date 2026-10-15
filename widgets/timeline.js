/* timeline — a true-scale timeline with one shared detail panel (from fbi-cia-nsa.html).
 *
 *   ```timeline {key="agency=Agency created; statute=Statute" today=2026-10-14 ticks="1908 1950 2026"}
 *   Year | Kind | Title | Detail
 *   1908 | agency | The Bureau of Investigation is founded | Attorney General …
 *   ```
 * First column: a year (1908) or a date (2026-02-03). A column named Kind picks the marker:
 * a name from `key` (marker styles in key order), or a topic colour from the front matter.
 * The last column is the detail; the one before it the title. `today` hollows out later events.
 * Static HTML is an ordered list (readable without script, and on narrow screens); the
 * runtime draws the proportional track.
 */
import { firstTable, cells, esc, cleanClass } from "../lib/wkit.js";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function when(s) {
  s = String(s).trim();
  let m = s.match(/^(-?\d{1,4})$/);
  if (m) return { v: +m[1], y: +m[1], mo: null, d: null };
  m = s.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (m) {
    const y = +m[1], mo = +m[2] - 1, d = m[3] ? +m[3] : 1;
    const start = Date.UTC(y, 0, 1), end = Date.UTC(y + 1, 0, 1);
    return { v: y + (Date.UTC(y, mo, d) - start) / (end - start), y, mo, d: m[3] ? d : null };
  }
  return null;
}

function long(w) {
  if (w.mo === null) return String(w.y);
  return w.d ? `${MON[w.mo]} ${w.d}, ${w.y}` : `${MON[w.mo]} ${w.y}`;
}

function autoTicks(min, max, dated) {
  const span = max - min;
  if (dated && span <= 2.5) {
    const out = [];
    const step = span <= 0.75 ? 1 : span <= 1.5 ? 2 : 3;
    let y = Math.floor(min), mo = Math.ceil((min - y) * 12 - 1e-9);
    for (;;) {
      if (mo > 11) { y++; mo -= 12; }
      const v = y + mo / 12;
      if (v > max + 1e-9) break;
      if (v >= min - 1e-9) out.push({ v, label: mo === 0 ? `${MON[0]} ${y}` : MON[mo] });
      mo += step;
    }
    if (out.length && !/\d/.test(out[0].label)) out[0].label += ` ${Math.floor(out[0].v + 1e-9)}`;
    return out;
  }
  const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500];
  const step = steps.find((s) => span / s <= 7) || 1000;
  const out = [{ v: min, label: String(Math.round(min)) }];
  for (let v = Math.ceil(min / step) * step; v < max; v += step) {
    if (v - min > step * 0.45 && max - v > step * 0.45) out.push({ v, label: String(v) });
  }
  out.push({ v: max, label: String(Math.round(max)) });
  return out;
}

export const timeline = {
  render(b, ctx) {
    const t = firstTable(b.body);
    if (!t) { ctx.warn("timeline: needs a table whose first column is a year or date"); return ""; }
    const kv = b.a.kv, n = t.cols.length;
    const kindCol = t.cols.findIndex((c) => /^(kind|type)$/i.test(c.name));
    const detCol = n - 1;
    let titleCol = n - 2;
    if (titleCol === kindCol || titleCol <= 0) titleCol = n >= 3 ? n - 2 : -1;

    const keys = [];
    for (const part of String(kv.key || "").split(";")) {
      const m = part.match(/^\s*([\w-]+)\s*=\s*(.+?)\s*$/);
      if (m) keys.push({ name: cleanClass(m[1]), label: m[2] });
    }
    const today = kv.today ? when(kv.today) : null;

    const evs = [];
    let prev = -Infinity, dated = false;
    for (const row of t.rows) {
      const c = cells(row, n);
      const w = when(c[0].text);
      if (!w) { ctx.warn(`timeline: "${c[0].text}" is not a year or YYYY-MM-DD date`); continue; }
      if (w.v < prev) ctx.warn(`timeline: "${c[0].text}" is out of order`);
      prev = w.v;
      if (w.mo !== null) dated = true;
      const kind = kindCol >= 0 ? cleanClass(c[kindCol].text) : "";
      evs.push({ w, kind, title: titleCol >= 0 ? c[titleCol].text : "", detail: c[detCol].text, a: c[0].a || c[titleCol]?.a });
    }
    if (!evs.length) return "";

    let min = evs[0].w.v, max = evs[evs.length - 1].w.v;
    let ticks;
    if (kv.ticks) {
      ticks = String(kv.ticks).split(/\s+/).map(when).filter(Boolean).map((w) => ({ v: w.v, label: w.mo === null ? String(w.y) : (w.mo === 0 ? `${MON[0]} ${w.y}` : MON[w.mo]) }));
    }
    if (ticks && ticks.length) { min = Math.min(min, ticks[0].v); max = Math.max(max, ticks[ticks.length - 1].v); }
    if (today) { min = Math.min(min, today.v); max = Math.max(max, today.v); }
    if (dated && !kv.ticks) {
      min = Math.floor(min * 12) / 12;
      max = Math.ceil(max * 12 + 1e-9) / 12;
    }
    if (max === min) max = min + 1;
    if (!ticks || !ticks.length) ticks = autoTicks(min, max, dated);
    let posOf = (v) => (v - min) / (max - min);
    if (kv.scale === "even") {
      // equal spacing, for chronologies where a few early events would squeeze the rest;
      // "today" still lands between the right neighbours. No axis: the dot labels carry dates.
      const k = evs.length, at = (i) => (k === 1 ? 0.5 : 0.03 + (0.94 * i) / (k - 1));
      posOf = (v) => {
        if (v <= evs[0].w.v) return at(0);
        if (v > evs[k - 1].w.v) return Math.min(0.99, at(k - 1) + 0.02);
        for (let i = 1; i < k; i++) if (v <= evs[i].w.v) {
          const a = evs[i - 1].w.v, b = evs[i].w.v;
          return at(i - 1) + (at(i) - at(i - 1)) * (b === a ? 0 : (v - a) / (b - a));
        }
        return at(k - 1);
      };
      ticks = [];
    }
    const pos = (v) => posOf(v).toFixed(4);

    const short = (w) => w.mo === null ? String(w.y) : (max - min <= 1.5 ? `${MON[w.mo]}${w.d ? " " + w.d : ""}` : `${MON[w.mo]} ${w.y}`);
    const items = evs.map((e) => {
      const ki = keys.findIndex((k) => k.name === e.kind);
      const cls = ["tl-ev", ki >= 0 ? "k" + ki : "", ctx.colors[e.kind] ? "kt c-" + e.kind : "",
        today && e.w.v > today.v + 1e-9 ? "future" : "", ...((e.a && e.a.cls) || []).map(cleanClass)].filter(Boolean);
      return `<li class="${esc(cls.join(" "))}" data-p="${pos(e.w.v)}"><span class="tl-y">${esc(long(e.w))}</span>` +
        `<span class="tl-s" hidden>${esc(short(e.w))}</span><b class="tl-t">${ctx.inline(e.title)}</b>` +
        `<span class="tl-b">${ctx.inline(e.detail)}</span></li>`;
    }).join("");
    const legend = keys.length ? `<div class="tl-key">${keys.map((k, i) => `<span><i class="k${i}${ctx.colors[k.name] ? " kt c-" + k.name : ""}"></i>${ctx.inline(k.label)}</span>`).join("")}` +
      (today ? `<span><i class="fut"></i>After today</span>` : "") + `</div>` : "";
    const tickHtml = ticks.map((tk) => `<span data-p="${pos(tk.v)}">${esc(tk.label)}</span>`).join("");
    return `<div class="tl" data-w="timeline"${today ? ` data-today="${pos(today.v)}"` : ""}>` +
      `<ol class="tl-list">${items}</ol><div class="tl-ticks" hidden>${tickHtml}</div>${legend}</div>`;
  },
};
