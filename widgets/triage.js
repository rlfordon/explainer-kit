/* triage — scored items on a 0–1 axis split by two thresholds into three zones, with counts,
 * errors and a scenario switch (from the two-threshold demos in jev-legal-research.html and
 * jev-beyond-classification.html).
 *
 *   ```triage {title="…" lo=0.30 hi=0.85 lo-label="Flag below" hi-label="Accept above" axis="Reported probability"}
 *   class yes: Source really does support it | accent good
 *   class no: Source does not support it | bad ring
 *   yes: .97 .95 .91 …
 *   no: .12 .40 …
 *   scenario Well calibrated: round(p, 2)
 *   scenario Overconfident: round(sigmoid(logit(p)*3.29), 2)
 *   zone low: Flag | flagged as unsupported. **{lowGood}** of them were fine.
 *   zone mid: Person reads | sent to a person, **{mid/total | percent}** of the pile.
 *   zone high: Accept | accepted without review. **{highBad}** were bad ({highBad/high | pct1}).
 *   say if highBad + lowGood > 0: Outlined dots are the errors.
 *   ```
 * class KEY: Label | colour [good] [ring] — colour is ok, bad, warn, accent, ink, muted or a
 *   topic colour; "good" items are errors in the low zone, other items errors in the high zone;
 *   "ring" draws a hollow dot. KEY: scores — that class's items, 0–1, separated by spaces.
 * scenario Label: formula of p (the score) and class (its KEY, a string) — rescales every score;
 *   the first is the starting one. Without scenarios the scores are used as written.
 * zone low|mid|high: Band label | readout text (the zone's count is shown big beside it).
 * say [if formula:] text. Formulas and texts may use: low mid high total, lowGood lowBad
 *   midGood midBad highGood highBad, lo hi (lib/expr.js; formats as in calc).
 * Attributes: lo, hi (starting thresholds), lo-range / hi-range ("min max", default "0 1"),
 *   lo-label, hi-label, lo-incl=yes (the low zone includes lo itself; otherwise p < lo),
 *   axis (the axis caption), .rows (one row per class instead of one jittered band),
 *   zone-colors="bad warn ok" (the low, middle and high zones' colours; the default),
 *   .fade-mid (grey the dots between the thresholds, so the two ends stand out).
 * A score at or above hi is in the high zone.
 */
import { shell, esc, cleanClass } from "../lib/wkit.js";
import { compile } from "../lib/expr.js";
import { liveText, checkFormula, evalSafe } from "../lib/live.js";
import { jitter } from "../lib/rand.js";

export const TG_VARS = ["low", "mid", "high", "total", "lowGood", "lowBad", "midGood", "midBad", "highGood", "highBad", "lo", "hi"];
const COLOURS = { ok: "var(--ok)", bad: "var(--bad)", warn: "var(--warn)", accent: "var(--accent)", ink: "var(--ink-2)", muted: "var(--ink-3)" };
const MAX_ITEMS = 2000;
const pct = (v) => (Math.min(Math.max(v, 0), 1) * 100).toFixed(2) + "%";

export function zoneOf(p, lo, hi, incl) {
  if (p >= hi) return "high";
  return (incl ? p <= lo : p < lo) ? "low" : "mid";
}

export function tally(items, lo, hi, incl, scale) {
  const s = { low: 0, mid: 0, high: 0, lowGood: 0, lowBad: 0, midGood: 0, midBad: 0, highGood: 0, highBad: 0, total: items.length, lo, hi };
  for (const it of items) {
    const z = zoneOf(scale(it), lo, hi, incl);
    s[z]++;
    s[z + (it.good ? "Good" : "Bad")]++;
  }
  return s;
}

const range = (s, d) => { const r = String(s || "").split(/\s+/).map(Number); return r.length === 2 && r.every(Number.isFinite) && r[0] < r[1] ? r : d; };

export const triage = {
  render(b, ctx) {
    const kv = b.a.kv;
    const classes = [], scenarios = [], zones = {}, says = [];
    const items = [];
    for (const raw of String(b.body).split("\n")) {
      const line = raw.trim();
      if (!line || line.startsWith("//")) continue;
      let m;
      if ((m = line.match(/^class\s+([\w-]+)\s*:\s*(.*?)\s*\|\s*(.*)$/))) {
        const words = m[3].split(/\s+/).map((w) => w.toLowerCase());
        const col = words.find((w) => COLOURS[w] || ctx.colors[cleanClass(w)]) || "";
        classes.push({ key: m[1], label: m[2], good: words.includes("good"), ring: words.includes("ring"),
          colour: COLOURS[col] ? COLOURS[col] : "", topic: !COLOURS[col] && col ? cleanClass(col) : "" });
      } else if ((m = line.match(/^scenario\s+(.*?)\s*:\s+(.+)$/))) {
        if (checkFormula(m[2], ["p", "class"], ctx, "triage: scenario")) scenarios.push({ label: m[1], x: m[2] });
      } else if ((m = line.match(/^zone\s+(low|mid|high)\s*:\s*(.*?)(?:\s\|\s(.*))?$/))) {
        zones[m[1]] = { label: m[2], text: m[3] || "" };
      } else if ((m = line.match(/^say\s+(?:if\s+(.+?):\s+)?(.*)$/))) {
        says.push({ cond: m[1] || "", text: m[2] });
      } else if ((m = line.match(/^([\w-]+)\s*:\s*([-\d.\s]+)$/))) {
        const ci = classes.findIndex((c) => c.key === m[1]);
        if (ci < 0) { ctx.warn(`triage: scores for "${m[1]}", which has no class line before them`); continue; }
        for (const v of m[2].trim().split(/\s+/)) {
          const p = Number(v);
          if (!Number.isFinite(p) || p < 0 || p > 1) { ctx.warn(`triage: "${v}" is not a score between 0 and 1`); continue; }
          if (items.length < MAX_ITEMS) items.push({ p, c: ci, good: classes[ci].good });
        }
      } else {
        ctx.warn(`triage: cannot read "${line.slice(0, 50)}"`);
      }
    }
    if (!items.length) { ctx.warn("triage: no scores"); return ""; }
    if (items.length >= MAX_ITEMS) ctx.warn(`triage: only the first ${MAX_ITEMS} scores are used`);
    if (!classes.some((c) => c.good)) ctx.warn('triage: no class is marked "good", so errors cannot be counted');

    const loR = range(kv["lo-range"], [0, 1]), hiR = range(kv["hi-range"], [0, 1]);
    let lo = Number(kv.lo), hi = Number(kv.hi);
    if (!Number.isFinite(lo)) lo = 0.3;
    if (!Number.isFinite(hi)) hi = 0.85;
    lo = Math.min(Math.max(lo, loR[0]), loR[1]); hi = Math.min(Math.max(hi, hiR[0]), hiR[1]);
    if (lo > hi) { ctx.warn("triage: lo is above hi"); lo = hi; }
    const incl = kv["lo-incl"] === "yes";
    const rows = b.a.cls.includes("rows");
    const scen0 = scenarios[0] ? compile(scenarios[0].x, ["p", "class"]) : null;
    const scale = (it) => {
      if (!scen0) return it.p;
      const v = +scen0.run(new Map([["p", it.p], ["class", classes[it.c].key]]));
      return Number.isFinite(v) ? Math.min(Math.max(v, 0), 1) : 0;
    };
    const s = tally(items, lo, hi, incl, scale);
    const scope = new Map(Object.entries(s));
    const zl = { low: "Below", mid: "Between", high: "Above", ...Object.fromEntries(Object.entries(zones).map(([k, z]) => [k, z.label])) };

    // controls
    const slider = (which, v, r, label) => {
      const id = ctx.uid("tg");
      return `<div class="cx-ctrl"><label for="${id}">${ctx.inline(label)} <output class="cx-out">${v.toFixed(2)}</output></label>` +
        `<input type="range" id="${id}" data-t="${which}" min="${r[0]}" max="${r[1]}" step="0.01" value="${v}"></div>`;
    };
    let h = `<div class="cx-ctrls">` + slider("lo", lo, loR, kv["lo-label"] || "Low threshold") + slider("hi", hi, hiR, kv["hi-label"] || "High threshold");
    if (scenarios.length > 1) {
      const lab = ctx.uid("tg");
      h += `<div class="cx-ctrl tg-scen"><div class="clab" id="${lab}">${ctx.inline(kv.scenario || "Scenario")}</div><div class="seg" role="group" aria-labelledby="${lab}">` +
        scenarios.map((sc, i) => `<button type="button" data-s="${esc(sc.x)}" aria-pressed="${i === 0}">${ctx.inline(sc.label)}</button>`).join("") + `</div></div>`;
    }
    h += `</div>`;
    if (scenarios.length === 1) h += `<span class="tg-scen-one" hidden data-s="${esc(scenarios[0].x)}"></span>`;

    // the plot: zone bands, threshold lines, dots (HTML, positioned in %)
    const nRows = rows ? classes.length : 1;
    const dots = items.map((it, i) => {
      const p = scale(it), z = zoneOf(p, lo, hi, incl), c = classes[it.c];
      const err = (z === "high" && !it.good) || (z === "low" && it.good);
      const y = rows ? ((it.c + 0.18 + 0.64 * jitter(i, 7)) / nRows) : 0.08 + 0.84 * jitter(i, 7);
      return `<span class="tg-dot${c.ring ? " ring" : ""}${err ? " err" : ""}${z === "mid" ? " mid" : ""}${c.topic ? " c-" + esc(c.topic) : ""}" data-p="${it.p}" data-c="${it.c}"${it.good ? ' data-g="1"' : ""}` +
        ` style="${c.colour ? "--dc:" + c.colour + ";" : ""}left:${pct(p)};top:${(y * 100).toFixed(2)}%"></span>`;
    }).join("");
    const band = (z, a, w) => `<div class="tg-band ${z}" style="left:${pct(a)};width:${pct(w)}"><span${w < 0.13 ? " hidden" : ""}>${ctx.inline(zl[z])}</span></div>`;
    const axisLabel = kv.axis ? `<div class="tg-axlab">${ctx.inline(kv.axis)}</div>` : "";
    const rowLabels = rows ? `<div class="tg-rows" aria-hidden="true">${classes.map((c) => `<span>${ctx.inline(c.label)}</span>`).join("")}</div>` : "";
    const summary = `${s.low} ${zl.low.toLowerCase()}, ${s.mid} ${zl.mid.toLowerCase()}, ${s.high} ${zl.high.toLowerCase()}`;
    h += `<div class="tg-wrap${rows ? " has-rows" : ""}" style="--rows:${nRows}">${rowLabels}<div class="tg-main">` +
      `<div class="tg-plot" style="--rows:${nRows}" role="img" aria-label="${esc(items.length + " items by score: " + summary)}">` +
      band("low", 0, lo) + band("mid", lo, hi - lo) + band("high", hi, 1 - hi) +
      `<div class="tg-line lo" style="left:${pct(lo)}"></div><div class="tg-line hi" style="left:${pct(hi)}"></div>` +
      (rows ? classes.map((c, i) => `<span class="tg-rowlab" style="top:${(i / nRows * 100).toFixed(2)}%" aria-hidden="true">${ctx.inline(c.label)}</span>`).join("") : "") +
      dots + `</div><div class="tg-axis" aria-hidden="true">${[0, 0.25, 0.5, 0.75, 1].map((v) => `<span style="left:${v * 100}%">${v.toFixed(2)}</span>`).join("")}</div>${axisLabel}</div></div>`;

    // legend, stacked share of each zone, readouts, sentences
    h += `<div class="tg-legend">${classes.map((c, i) => `<span><i class="tg-dot${c.ring ? " ring" : ""}${c.topic ? " c-" + esc(c.topic) : ""}" data-c="${i}"${c.colour ? ` style="--dc:${c.colour}"` : ""}></i>${ctx.inline(c.label)}</span>`).join("")}</div>`;
    h += `<div class="tg-stack" aria-hidden="true">${["low", "mid", "high"].map((z) => `<span class="${z}" style="width:${pct(s[z] / s.total)}"></span>`).join("")}</div>`;
    const known = TG_VARS;
    h += `<div class="tg-read">${["low", "mid", "high"].map((z) => `<div class="tg-z ${z}"><b class="xv" data-x="${z}">${s[z]}</b><span>` +
      (zones[z] && zones[z].text ? liveText(zones[z].text, ctx, known, scope, "triage: zone") : ctx.inline(zl[z])) + `</span></div>`).join("")}</div>`;
    for (const sy of says) {
      const ok = !sy.cond || checkFormula(sy.cond, known, ctx, "triage: say if");
      const shown = !sy.cond || (ok && Boolean(evalSafe(sy.cond, known, scope)));
      h += `<p class="cx-say tg-say"${sy.cond && ok ? ` data-if="${esc(sy.cond)}"` : ""}${shown ? "" : " hidden"}>${liveText(sy.text, ctx, known, scope, "triage: say")}</p>`;
    }
    // zone colours (named colours only) and the low-zone rule travel as attributes
    const zc = String(kv["zone-colors"] || "").split(/\s+/).map((w) => COLOURS[w.toLowerCase()]);
    const zstyle = zc.length === 3 && zc.every(Boolean) ? ` style="--z-low:${zc[0]};--z-mid:${zc[1]};--z-high:${zc[2]}"` : "";
    if (kv["zone-colors"] && !zstyle) ctx.warn("triage: zone-colors needs three of ok, bad, warn, accent, ink, muted");
    return shell("triage", b, ctx, h,
      { data: `${zstyle}${incl ? ' data-incl="1"' : ""} data-classes="${esc(classes.map((c) => c.key).join(" "))}"` });
  },
};
