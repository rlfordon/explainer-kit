/* stepper — step through stages, optionally for several tracks (from fbi-cia-nsa.html's tracer).
 *
 *   ```stepper {title="Follow one message" rail="The target|Collection point|The authority|US persons" unit=Gate}
 *   - **Message A** Two foreign officials abroad, on a foreign network.
 *     1. **Who is the target?** A foreign government official …
 *     2. **What law authorizes it?** [No court, no warrant]{.bad} Executive Order 12333 …
 *   - **Message B** …
 *   ```
 * Top-level items are tracks (pick one); their numbered children are the stages. With a
 * single track, write the stages as the top-level numbered list. A stage's bold opening is
 * its title, the rest its body; indented paragraphs continue it.
 */
import { firstList, shell, lead, esc } from "../lib/wkit.js";

export const stepper = {
  render(b, ctx) {
    const l = firstList(b.body);
    if (!l) { ctx.warn("stepper: needs a list (tracks with numbered stages, or just numbered stages)"); return ""; }
    const kv = b.a.kv;
    let tracks = l.items.some((it) => it.children.length) ? l.items : [{ text: "", children: l.items, paras: [] }];
    tracks = tracks.filter((t) => t.children.length);
    const unit = kv.unit || "Step";
    const counts = tracks.map((t) => t.children.length);
    const n = Math.max(...counts);
    if (new Set(counts).size > 1) ctx.warn("stepper: tracks have different numbers of stages");
    const rail = String(kv.rail || "").split("|").map((s) => s.trim()).filter(Boolean);
    if (rail.length && rail.length !== n) ctx.warn(`stepper: rail has ${rail.length} labels for ${n} stages`);

    let h = "";
    if (tracks.length > 1) {
      h += `<div class="wires" role="group" aria-label="${esc(kv.pick || "Choose one")}">` + tracks.map((t, i) => {
        const [name, rest] = lead(t.text);
        return `<button type="button" class="wire" data-t="${i}" aria-pressed="${i === 0}"><b>${ctx.inline(name || "Track " + (i + 1))}</b>${ctx.inline(rest)}</button>`;
      }).join("") + `</div>`;
    }
    h += `<div class="rail" aria-hidden="true" style="--n:${n}" hidden>` +
      Array.from({ length: n }, (_, i) => `<div class="rl">${rail[i] ? ctx.inline(rail[i]) : ""}</div>`).join("") + `</div>`;
    h += tracks.map((t, ti) => `<div class="st-track" data-t="${ti}">` + t.children.map((s, si) => {
      const [title, rest] = lead(s.text);
      return `<div class="stage" data-s="${si}"><div class="sn">${esc(unit)} ${si + 1} of ${t.children.length}</div>` +
        (title ? `<h4>${ctx.inline(title)}</h4>` : "") +
        `<div class="sb">${rest.trim() ? `<p>${ctx.inline(rest)}</p>` : ""}${ctx.paras(s.paras)}</div></div>`;
    }).join("") + `</div>`).join("");
    h += `<div class="btnrow" hidden><button type="button" class="btn btn-primary" data-act="next">${esc(kv.next || "Next " + unit.toLowerCase())}</button>` +
      `<button type="button" class="btn btn-ghost" data-act="back">Back</button><span class="stepcount"></span></div>`;
    return shell("stepper", b, ctx, h);
  },
};
