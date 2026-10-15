/* calc — sliders and choices feeding formulas: a calculator (from jev-legal-research.html's
 * cost demo). One instruction per line, shown in the order written:
 *
 *   ```calc {title="What a corpus-wide pass would cost" hint="Drag, or pick a preset"}
 *   preset 5,000 cite-checks: n=5000, t=500, q=3
 *   slider n: Requests | 1e6 | 100 to 1e8 | log | count
 *   slider q: Questions per request | 4 | 1 to 10 | step 1
 *   choice cal: Model calibration | Well calibrated = 1 | Overconfident = 3.29
 *   let per = t + q*40
 *   result Cost at list price, output free | n*per/1e6*0.042 | money
 *   meter per/32000 | over per > 32000
 *   say if per > 32000: **{per | int} tokens** exceeds the limit; split into {ceil(t/(32000-q*40))} chunks.
 *   say Plain text with a live {n*q | count} in it.
 *   ```
 * slider NAME: Label | start | min to max [| log] [| step S] [| format]   (log: a log scale,
 *   whole numbers when min ≥ 1). choice NAME: Label | Option = value | …  (a value is a number
 *   or a "string"; the first option starts selected). preset Label: name=value, …
 * let NAME = formula (may use inputs and earlier lets). result Label | formula [| format].
 * meter formula (0–1 fills the bar) [| over formula (true turns it red)].
 * say [if formula:] text, inline Markdown with {formula} or {formula | format}.
 * Formulas: lib/expr.js. Formats: int count money percent pct1 duration dec0–dec3.
 * Consecutive sliders/choices share one row of controls, consecutive results one row.
 */
import { shell, esc } from "../lib/wkit.js";
import { FORMATS, fmt } from "../lib/expr.js";
import { liveText, evalSafe, checkFormula } from "../lib/live.js";

const NAME = /^[A-Za-z_][A-Za-z0-9_]{0,30}$/;
const parts = (s) => s.split(/\s\|\s/).map((x) => x.trim());
const numOf = (s) => evalSafe(String(s), [], new Map());

export function sliderPos(v, it) { return it.log ? Math.log10(Math.max(v, 1e-12)) : v; }
export function sliderVal(pos, it) {
  if (!it.log) return pos;
  const v = 10 ** pos;
  return it.min >= 1 ? Math.round(v) : +v.toPrecision(3);
}

export function parseCalc(body, ctx) {
  const items = [], names = [];
  const name = (n, kind) => {
    if (!NAME.test(n)) { ctx.warn(`calc: "${n}" is not a usable name for a ${kind} (letters, digits, _)`); return false; }
    if (names.includes(n)) { ctx.warn(`calc: "${n}" is defined twice`); return false; }
    names.push(n); return true;
  };
  for (const raw of String(body).split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("//")) continue;
    let m;
    if ((m = line.match(/^slider\s+(\w+)\s*:\s*(.*)$/))) {
      const p = parts(m[2]);
      if (!name(m[1], "slider")) continue;
      const r = (p[2] || "").match(/^(.+?)\s+to\s+(.+)$/);
      const it = { k: "slider", name: m[1], label: p[0] || m[1], def: numOf(p[1]), min: r ? numOf(r[1]) : NaN, max: r ? numOf(r[2]) : NaN, log: false, step: NaN, f: "" };
      for (const x of p.slice(3)) {
        if (x === "log") it.log = true;
        else if (/^step\s+/.test(x)) it.step = numOf(x.slice(5));
        else if (FORMATS.includes(x)) it.f = x;
        else ctx.warn(`calc: slider ${it.name}: "${x}" is not log, step N or a format`);
      }
      if (![it.def, it.min, it.max].every(Number.isFinite) || it.min >= it.max) { ctx.warn(`calc: slider ${it.name} needs "start | min to max" with min < max`); continue; }
      if (it.log && it.min <= 0) { ctx.warn(`calc: slider ${it.name}: a log scale needs min > 0`); it.log = false; }
      it.def = Math.min(Math.max(it.def, it.min), it.max);
      items.push(it);
    } else if ((m = line.match(/^choice\s+(\w+)\s*:\s*(.*)$/))) {
      const p = parts(m[2]);
      if (!name(m[1], "choice")) continue;
      const opts = p.slice(1).map((o) => {
        const q = o.match(/^(.*?)\s*=\s*(?:"([^"]*)"|(.+))$/);
        if (!q) { ctx.warn(`calc: choice ${m[1]}: "${o}" should be Label = value`); return null; }
        return q[2] !== undefined ? { label: q[1], v: q[2], s: true } : { label: q[1], v: numOf(q[3]), s: false };
      }).filter(Boolean);
      if (!opts.length) { ctx.warn(`calc: choice ${m[1]} has no options`); continue; }
      items.push({ k: "choice", name: m[1], label: p[0], opts });
    } else if ((m = line.match(/^preset\s+(.*?)\s*:\s*(.*)$/))) {
      const sets = m[2].split(",").map((s) => s.trim().match(/^(\w+)\s*=\s*(.+)$/)).filter(Boolean).map((q) => [q[1], q[2].replace(/^"|"$/g, "")]);
      items.push({ k: "preset", label: m[1], sets });
    } else if ((m = line.match(/^let\s+(\w+)\s*=\s*(.+)$/))) {
      if (!name(m[1], "let")) continue;
      items.push({ k: "let", name: m[1], x: m[2] });
    } else if ((m = line.match(/^result\s+(.*)$/))) {
      const p = parts(m[1]);
      if (p.length < 2) { ctx.warn(`calc: result needs "Label | formula"`); continue; }
      items.push({ k: "result", label: p[0], x: p[1], f: FORMATS.includes(p[2]) ? p[2] : "" });
    } else if ((m = line.match(/^meter\s+(.*)$/))) {
      const p = parts(m[1]);
      const over = (p[1] || "").match(/^over\s+(.+)$/);
      items.push({ k: "meter", x: p[0], over: over ? over[1] : "" });
    } else if ((m = line.match(/^say\s+(?:if\s+(.+?):\s+)?(.*)$/))) {
      items.push({ k: "say", cond: m[1] || "", text: m[2] });
    } else {
      ctx.warn(`calc: cannot read "${line.slice(0, 50)}"`);
    }
  }
  return { items, names };
}

export const calc = {
  render(b, ctx) {
    const { items, names } = parseCalc(b.body, ctx);
    if (!items.length) { ctx.warn("calc: no instructions"); return ""; }
    // starting values, so the page reads correctly before (or without) script
    const scope = new Map();
    for (const it of items) {
      if (it.k === "slider") scope.set(it.name, sliderVal(sliderPos(it.def, it), it));
      if (it.k === "choice") scope.set(it.name, it.opts[0].v);
    }
    for (const it of items) if (it.k === "let") {
      if (checkFormula(it.x, names, ctx, `calc: let ${it.name}`)) scope.set(it.name, evalSafe(it.x, names, scope));
    }
    for (const it of items) if (it.k === "preset") for (const [n] of it.sets) if (!names.includes(n)) ctx.warn(`calc: preset "${it.label}" sets unknown "${n}"`);

    let h = "", group = "";
    const close = () => { if (group) { h += "</div>"; group = ""; } };
    const open = (g, cls) => { if (group !== g) { close(); h += `<div class="${cls}">`; group = g; } };
    for (const it of items) {
      if (it.k === "slider") {
        open("ctrl", "cx-ctrls");
        const id = ctx.uid("cx"), v = scope.get(it.name);
        const step = Number.isFinite(it.step) ? it.step : it.log ? 0.001 : (it.max - it.min) / 1000;
        const lo = it.log ? Math.log10(it.min) : it.min, hi = it.log ? Math.log10(it.max) : it.max;
        h += `<div class="cx-ctrl"><label for="${id}">${ctx.inline(it.label)} <output class="cx-out">${esc(fmt(v, it.f))}</output></label>` +
          `<input type="range" id="${id}" data-n="${esc(it.name)}" min="${lo}" max="${hi}" step="${step}" value="${sliderPos(v, it)}"` +
          `${it.log ? ` data-log="1" data-min="${it.min}"` : ""}${it.f ? ` data-f="${esc(it.f)}"` : ""}></div>`;
      } else if (it.k === "choice") {
        open("ctrl", "cx-ctrls");
        const lab = ctx.uid("cx");
        h += `<div class="cx-ctrl"><div class="clab" id="${lab}">${ctx.inline(it.label)}</div><div class="seg" role="group" aria-labelledby="${lab}" data-n="${esc(it.name)}">` +
          it.opts.map((o, i) => `<button type="button" data-v="${esc(String(o.v))}"${o.s ? ' data-s="1"' : ""} aria-pressed="${i === 0}">${ctx.inline(o.label)}</button>`).join("") + `</div></div>`;
      } else if (it.k === "preset") {
        open("preset", "cx-presets");
        h += `<button type="button" class="btn btn-ghost" data-set="${esc(it.sets.map(([n, v]) => `${n}=${v}`).join(";"))}">${ctx.inline(it.label)}</button>`;
      } else if (it.k === "let") {
        h += `<span class="cx-let" hidden data-n="${esc(it.name)}" data-l="${esc(it.x)}"></span>`;
      } else if (it.k === "result") {
        open("result", "cx-results");
        const ok = checkFormula(it.x, names, ctx, "calc: result");
        h += `<div class="cx-res"><b${ok ? ` class="xv" data-x="${esc(it.x)}"${it.f ? ` data-f="${esc(it.f)}"` : ""}` : ""}>${esc(fmt(ok ? evalSafe(it.x, names, scope) : NaN, it.f))}</b><span>${ctx.inline(it.label)}</span></div>`;
      } else if (it.k === "meter") {
        close();
        const ok = checkFormula(it.x, names, ctx, "calc: meter") && (!it.over || checkFormula(it.over, names, ctx, "calc: meter over"));
        const v = ok ? evalSafe(it.x, names, scope) : 0, over = ok && it.over ? Boolean(evalSafe(it.over, names, scope)) : false;
        h += `<div class="cx-meter"><div class="cx-track"><div class="cx-fill${over ? " over" : ""}"${ok ? ` data-m="${esc(it.x)}"${it.over ? ` data-o="${esc(it.over)}"` : ""}` : ""} style="width:${(Math.min(Math.max(+v || 0, 0), 1) * 100).toFixed(1)}%"></div></div></div>`;
      } else if (it.k === "say") {
        close();
        const condOk = !it.cond || checkFormula(it.cond, names, ctx, "calc: say if");
        const shown = !it.cond || (condOk && Boolean(evalSafe(it.cond, names, scope)));
        h += `<p class="cx-say"${it.cond && condOk ? ` data-if="${esc(it.cond)}"` : ""}${shown ? "" : " hidden"}>${liveText(it.text, ctx, names, scope, "calc: say")}</p>`;
      }
    }
    close();
    return shell("calc", b, ctx, h);
  },
};
