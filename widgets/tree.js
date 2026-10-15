/* tree — a decision tree you click through, one question at a time (new; for client pages).
 *
 *   ```tree {title="Which route fits?"}
 *   - Do you need this resolved before the financing closes?
 *     - Yes -> **Settle or mediate.** A defended case will not close in time.
 *     - No
 *       - Is keeping the supplier relationship worth more than $50k?
 *         - Yes -> **Mediate.** It keeps the door open.
 *         - No -> **Defend**, and we revisit after discovery.
 *   ```
 * A question's children are its answers. An answer either ends with "-> outcome" or has
 * one child question. Static HTML is the whole tree as nested lists (it prints that way).
 */
import { firstList, shell } from "../lib/wkit.js";

function question(q, ctx, path) {
  if (!q.children.length) ctx.warn(`tree: "${q.text.slice(0, 40)}" has no answers`);
  return `<li class="tq"><div class="tq-t">${ctx.inline(q.text)}</div><ul class="ta-list">` + q.children.map((a, k) => {
    const m = a.text.match(/^([\s\S]*?)\s*(?:->|→)\s*([\s\S]+)$/);
    const label = m ? m[1] : a.text;
    let inner;
    if (m) {
      inner = `<div class="tout">${ctx.inline(m[2])}${ctx.paras(a.paras)}</div>`;
      if (a.children.length) ctx.warn(`tree: answer "${label.slice(0, 30)}" has both an outcome and a follow-up`);
    } else if (a.children.length) {
      if (a.children.length > 1) ctx.warn(`tree: answer "${label.slice(0, 30)}" has ${a.children.length} follow-ups; only the first is used`);
      inner = `<ul class="tq-list">${question(a.children[0], ctx, path + "." + k)}</ul>`;
    } else {
      ctx.warn(`tree: answer "${label.slice(0, 30)}" leads nowhere (add "-> outcome" or a follow-up question)`);
      inner = "";
    }
    return `<li class="ta"><span class="ta-t">${ctx.inline(label)}</span>${inner}</li>`;
  }).join("") + `</ul></li>`;
}

export const tree = {
  render(b, ctx) {
    const l = firstList(b.body);
    if (!l || !l.items.length) { ctx.warn("tree: needs a nested list"); return ""; }
    if (l.items.length > 1) ctx.warn("tree: only the first top-level question is used");
    const h = `<ul class="tq-list tree-static">${question(l.items[0], ctx, "0")}</ul>`;
    return shell("tree", b, ctx, h);
  },
};
