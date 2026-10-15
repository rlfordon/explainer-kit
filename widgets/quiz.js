/* quiz — one question at a time, the right answer marked in words, then why (from fbi-cia-nsa.html).
 *
 *   ```quiz {.stacked}          (default is paged: one question per card)
 *   1. Which of the three can arrest someone inside the United States?
 *      - [x] The FBI only
 *      - [ ] The FBI and the CIA
 *      > Arrest authority sits with the FBI alone …
 *   ```
 * Exactly one option per question is [x]. The > lines are the explanation.
 */
import { firstList, esc, quoteParas } from "../lib/wkit.js";

export const quiz = {
  render(b, ctx) {
    const l = firstList(b.body);
    if (!l) { ctx.warn("quiz: needs a numbered list of questions with - [ ] / - [x] options"); return ""; }
    const qs = l.items.filter((q) => q.children.length);
    const marks = "ABCDEFGH";
    const items = qs.map((q, qi) => {
      const opts = q.children;
      const right = opts.map((o, k) => (o.done ? k : -1)).filter((k) => k >= 0);
      if (right.length !== 1) ctx.warn(`quiz: question ${qi + 1} has ${right.length} answers marked [x] (needs exactly one)`);
      if (!q.quote.length && !q.paras.length) ctx.warn(`quiz: question ${qi + 1} has no explanation (add > lines)`);
      return `<li class="qz" data-answer="${right[0] ?? 0}"><div class="q">${ctx.inline(q.text)}</div><div class="opts">` +
        opts.map((o, k) => `<button type="button" class="opt" data-i="${k}"><span class="mk">${marks[k] || k + 1}</span><span>${ctx.inline(o.text)}</span></button>`).join("") +
        `</div><div class="why" hidden><b class="why-h">Why</b>${ctx.paras(quoteParas(q.quote).concat(q.paras))}</div></li>`;
    }).join("");
    const kv = b.a.kv;
    const stacked = b.a.cls.includes("stacked");
    return `<div class="quiz${stacked ? " stacked" : ""}" data-w="quiz"${b.a.id ? ` id="${esc(b.a.id)}"` : ""}>` +
      `<div class="quiz-head"><span class="qn qn-num">${qs.length} questions</span><span class="qn qn-score"></span></div>` +
      `<div class="quiz-body"><ol class="qz-list">${items}</ol>` +
      `<div class="qz-done" hidden><div class="score"></div><p class="qz-msg" data-all="${esc(kv.all || "Every one right.")}" data-most="${esc(kv.most || "A solid grasp. The ones you missed are worth a second look above.")}" data-few="${esc(kv.few || "Worth another pass through the sections above, which cover every question here.")}"></p>` +
      `<div class="btnrow"><button type="button" class="btn btn-primary" data-act="again">Try again</button></div></div></div></div>`;
  },
};
