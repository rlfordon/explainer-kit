/* locator — ask one question of every passage and see where the answer lives; click a
 * sentence to remove it and watch what moves (from jev-beyond-classification.html's heat map).
 *
 *   ```locator {title="…" temp=2.5 relative="Choice across paragraphs" absolute="Noul per paragraph" note="…"}
 *   question: Where does the court decide whether the exception requires a request? | we hold 3, clothing exception 1.5, argues -1 | bias 2.5 | none 2
 *   question: Where does the court state the standard of review? | de novo 2.5, clear error 2.5, review 1.2
 *   passage Facts: Officers arrested Dana Price on her porch. | She was barefoot, and it was 18 degrees outside.
 *   passage Holding: We hold that the clothing exception does not require a request.
 *   ```
 * A question's weights are "phrase number" pairs: a phrase found in a sentence (case-insensitive,
 * plain text, no patterns) adds its number to that passage's score, once per sentence. A
 * passage's sentences are separated by " | ". The scorer is a stand-in, so say so on the page.
 * Relative mode: a softmax over the passages plus a "none of these" option (score `none`,
 * default 2) at temperature `temp` (default 2.5); the values sum to 1. Absolute mode: each
 * passage alone, sigmoid(score − `bias`) (default 2.5). Name a mode with `relative=` or
 * `absolute=`; give one to offer only that mode, both (or neither) for a toggle. Optional:
 * `mode-label` (default "Ask as"), `restore` (button text), `note` (a note under the controls).
 */
import { shell, esc } from "../lib/wkit.js";
import { splitRow, plain } from "../lib/md.js";

const MAX_Q = 12, MAX_P = 200, MAX_S = 60, MAX_W = 60;

function num(s, def, lo, hi) {
  const v = Number(s);
  return Number.isFinite(v) && v >= lo && v <= hi ? v : def;
}

function weights(spec, ctx) {
  const out = [];
  for (const part of String(spec || "").split(",")) {
    const t = part.trim();
    if (!t) continue;
    const m = t.match(/^(.*\S)\s+([+-]?\d*\.?\d+)$/);
    if (!m) { ctx.warn(`locator: weight "${t.slice(0, 40)}" needs a phrase and a number`); continue; }
    const phrase = plain(m[1]).toLowerCase().slice(0, 200), w = Number(m[2]);
    if (!phrase || !Number.isFinite(w) || Math.abs(w) > 100) { ctx.warn(`locator: weight "${t.slice(0, 40)}" is out of range`); continue; }
    if (out.length >= MAX_W) { ctx.warn(`locator: more than ${MAX_W} weights in one question`); break; }
    out.push([phrase, w]);
  }
  return out;
}

export const locator = {
  render(b, ctx) {
    const kv = (b.a && b.a.kv) || {};
    const qs = [], ps = [];
    for (const raw of String(b.body).split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      let m = line.match(/^question\s*:\s*(.+)$/i);
      if (m) {
        if (qs.length >= MAX_Q) { ctx.warn(`locator: more than ${MAX_Q} questions`); continue; }
        const parts = splitRow(m[1]);
        const q = { text: parts[0], w: weights(parts[1], ctx), bias: 2.5, none: 2 };
        for (const p of parts.slice(2)) {
          const o = p.match(/^(bias|none)\s*[= ]\s*([+-]?\d*\.?\d+)$/i);
          if (o) q[o[1].toLowerCase()] = num(o[2], q[o[1].toLowerCase()], -100, 100);
          else if (p) ctx.warn(`locator: "${p.slice(0, 30)}" is not "bias N" or "none N"`);
        }
        if (!q.w.length) ctx.warn(`locator: question "${plain(q.text).slice(0, 40)}" has no weights`);
        qs.push(q);
        continue;
      }
      m = line.match(/^passage\b\s*([^:]*?)\s*:\s*(.+)$/i);
      if (m) {
        if (ps.length >= MAX_P) { ctx.warn(`locator: more than ${MAX_P} passages`); continue; }
        const sents = splitRow(m[2]).filter(Boolean);
        if (sents.length > MAX_S) ctx.warn(`locator: a passage has more than ${MAX_S} sentences`);
        ps.push({ label: m[1], sents: sents.slice(0, MAX_S) });
        continue;
      }
      ctx.warn(`locator: "${line.slice(0, 40)}" is not a question: or passage line`);
    }
    if (!qs.length || !ps.length) { ctx.warn("locator: needs at least one question: line and one passage line"); return ""; }

    const both = !kv.relative === !kv.absolute;
    const modes = [];
    if (kv.relative || both) modes.push(["relative", kv.relative || "Compare across passages"]);
    if (kv.absolute || both) modes.push(["absolute", kv.absolute || "Score each passage alone"]);
    const temp = num(kv.temp, 2.5, 0.05, 100);

    const qlab = ctx.uid("lcq");
    let side = `<div class="lc-qs" role="group" aria-label="Question">` + qs.map((q, i) =>
      `<button type="button" class="lc-q" aria-pressed="${i === 0}" data-wt="${esc(JSON.stringify(q.w))}" data-bias="${q.bias}" data-none="${q.none}">${ctx.inline(q.text)}</button>`).join("") + `</div>`;
    if (modes.length > 1) {
      side += `<div class="lc-ctrl"><div class="clab" id="${qlab}">${ctx.inline(kv["mode-label"] || "Ask as")}</div>` +
        `<div class="seg lc-mode" role="group" aria-labelledby="${qlab}">` +
        modes.map(([m, l], i) => `<button type="button" data-m="${m}" aria-pressed="${i === 0}">${ctx.inline(l)}</button>`).join("") + `</div></div>`;
    }
    side += `<button type="button" class="btn btn-ghost lc-restore">${ctx.inline(kv.restore || "Restore all sentences")}</button>`;
    if (kv.note) side += `<p class="note lc-note">${ctx.inline(kv.note)}</p>`;

    const main = `<div class="lc-op">` + ps.map((p, pi) =>
      `<div class="lc-p"><div class="lc-m"></div><div class="lc-t"><span class="lc-tag">¶${pi + 1}${p.label ? " · " + ctx.inline(p.label) : ""}</span>` +
      p.sents.map((s) => `<button type="button" class="lc-s" aria-pressed="false">${ctx.inline(s)}</button>`).join(" ") +
      `</div></div>`).join("") + `</div><p class="lc-none" aria-live="polite"></p>`;

    return shell("locator", b, ctx,
      `<div class="lc" data-temp="${temp}" data-mode="${modes[0][0]}"><div class="lc-side">${side}</div><div class="lc-main">${main}</div></div>`);
  },
};
