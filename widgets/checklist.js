/* checklist — tick-off next steps with a running count.
 *
 *   ```checklist {title="Next steps"}
 *   - [ ] Send us the 2024 agreement and all amendments
 *   - [x] Sign the engagement letter
 *   ```
 * In a file, ticks are remembered in this browser. In a link they last only while the page
 * is open: a confidential page leaves nothing behind on the reader's device.
 */
import { firstList, esc } from "../lib/wkit.js";

export const checklist = {
  render(b, ctx) {
    const l = firstList(b.body);
    if (!l) { ctx.warn("checklist: needs a - [ ] list"); return ""; }
    const kv = b.a.kv;
    const id = ctx.uid("ck");
    const items = l.items.map((it, k) =>
      `<li><label><input type="checkbox"${it.done ? " checked" : ""} data-i="${k}"><span>${ctx.inline(it.text)}${ctx.paras(it.paras)}</span></label></li>`).join("");
    return `<div class="checklist" data-w="checklist" data-key="${esc(id + ":" + (ctx.head.title || "").slice(0, 60))}" data-persist="${ctx.mode === "file" ? 1 : 0}">` +
      (kv.title ? `<div class="ck-head"><h3>${ctx.inline(kv.title)}</h3><span class="ck-count"></span></div>` : `<div class="ck-head"><span class="ck-count"></span></div>`) +
      `<ul>${items}</ul></div>`;
  },
};
