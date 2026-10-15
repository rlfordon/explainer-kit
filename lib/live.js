/* live.js — formulas inside widget text: rendered once with starting values (so the page
 * reads without script), then kept current by the runtime. Used by calc and triage.
 *
 * Render side (Node or browser):  liveText(src, ctx, known, scope) → HTML
 *   src is inline Markdown with {formula} or {formula | format}; each formula becomes
 *   <span class="xv" data-x="formula" data-f="format">value</span>. A formula that does not
 *   compile is reported with ctx.warn and shown as "?".
 * Runtime side (browser):  live(root, known) → update(scope)
 *   recomputes every [data-x] (text) and [data-if] (shown only when true) inside root.
 * The formula text travels in a data attribute, escaped, and is only ever handed to
 * expr.js's compile(), never to eval.
 */
import { compile, fmt, template } from "./expr.js";
import { esc } from "./md.js";

export function evalSafe(src, known, scope) {
  try { return compile(src, known).run(scope); } catch (e) { return NaN; }
}

export function checkFormula(src, known, ctx, where) {
  try { compile(src, known); return true; } catch (e) { ctx.warn(`${where}: "${src}" — ${e.message}`); return false; }
}

export function liveText(src, ctx, known, scope, where = "formula") {
  const parts = template(src);
  const vals = [];
  let text = "";
  for (const p of parts) {
    if (p.text !== undefined) { text += p.text; continue; }
    const ok = checkFormula(p.x, known, ctx, where);
    const v = ok ? evalSafe(p.x, known, scope) : NaN;
    vals.push(ok ? `<span class="xv" data-x="${esc(p.x)}"${p.f ? ` data-f="${esc(p.f)}"` : ""}>${esc(fmt(v, p.f))}</span>` : "?");
    text += `\u0001${vals.length - 1}\u0001`;
  }
  return ctx.inline(text).replace(/\u0001(\d+)\u0001/g, (_, i) => vals[+i]);
}

export function live(root, known) {
  const cache = new Map();
  const get = (src) => {
    if (!cache.has(src)) { try { cache.set(src, compile(src, known)); } catch (e) { cache.set(src, null); } }
    return cache.get(src);
  };
  const outs = [...root.querySelectorAll("[data-x]")], conds = [...root.querySelectorAll("[data-if]")];
  return function update(scope) {
    for (const el of outs) {
      const c = get(el.dataset.x);
      el.textContent = c ? fmt(c.run(scope), el.dataset.f || "") : "?";
    }
    for (const el of conds) {
      const c = get(el.dataset.if);
      el.hidden = !(c && c.run(scope));
    }
  };
}
