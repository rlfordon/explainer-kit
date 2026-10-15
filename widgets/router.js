/* router — choose an answer on each axis; the matching row is the verdict (from fbi-cia-nsa.html).
 *
 *   ```router {title="Who has the lead?" hint="Set all three · verdict updates live"}
 *   Who is the subject:option | Where they are:option | Governing authority | Approval | Why:long | Lead | Supporting
 *   A US person | Inside the US | Title 18 criminal process | [Federal judge, probable cause]{.ok} | An ordinary … | [FBI]{.fbi} | —
 *   ```
 * Each :option column becomes a segmented control (values in order of first appearance).
 * Of the other columns: the first is the headline, the next ones up to the :long column are
 * badges under it, :long is the explanation, and any after it are labelled rows beside it.
 * Every combination should have a row; lint says which are missing.
 */
import { firstTable, shell, cells, esc } from "../lib/wkit.js";

export const router = {
  render(b, ctx) {
    const t = firstTable(b.body);
    if (!t) { ctx.warn("router: needs a table with :option columns"); return ""; }
    const n = t.cols.length;
    const axes = [], rest = [];
    t.cols.forEach((c, k) => (c.type === "option" ? axes : rest).push(k));
    if (!axes.length) { ctx.warn("router: no :option column"); return ""; }
    const values = axes.map(() => []);
    const rows = t.rows.map((r) => cells(r, n));
    for (const c of rows) axes.forEach((k, ai) => { if (!values[ai].includes(c[k].text)) values[ai].push(c[k].text); });

    const total = values.reduce((p, v) => p * v.length, 1);
    const keys = new Set(rows.map((c) => axes.map((k, ai) => values[ai].indexOf(c[k].text)).join("|")));
    if (keys.size < total) ctx.warn(`router: ${total - keys.size} of ${total} combinations have no row`);
    if (keys.size < rows.length) ctx.warn("router: some combinations have more than one row (the first wins)");

    const headK = rest[0];
    const longK = rest.find((k) => t.cols[k].type === "long");
    const badgeK = rest.filter((k) => k !== headK && (longK === undefined ? false : k < longK));
    const roleK = rest.filter((k) => k !== headK && !badgeK.includes(k) && k !== longK);

    let h = `<div class="ctrls" style="--n:${axes.length}">` + axes.map((k, ai) => {
      const lab = ctx.uid("ax");
      return `<div class="ctrl"><div class="clab" id="${lab}">${ctx.inline(t.cols[k].name)}</div>` +
        `<div class="seg" role="group" aria-labelledby="${lab}" data-axis="${ai}">` +
        values[ai].map((v, vi) => `<button type="button" data-v="${vi}" aria-pressed="${vi === 0}">${ctx.inline(v)}</button>`).join("") +
        `</div></div>`;
    }).join("") + `</div>`;

    h += `<div class="rt-vs">` + rows.map((c, ri) => {
      const key = axes.map((k, ai) => values[ai].indexOf(c[k].text)).join("|");
      const roles = roleK.map((k) => `<div class="role-row"><span class="rlab">${ctx.inline(t.cols[k].name)}</span><span>${ctx.inline(c[k].text)}</span></div>`).join("");
      return `<div class="verdict rt-v${roles ? "" : " solo"}" data-key="${key}"${ri ? " hidden" : ""}>` +
        `<div class="vmain">${headK !== undefined ? `<div class="authlab">${ctx.inline(t.cols[headK].name)}</div><div class="auth">${ctx.inline(c[headK].text)}</div>` : ""}` +
        badgeK.map((k) => c[k].text ? `<div class="badge">${ctx.inline(c[k].text)}</div>` : "").join("") +
        (longK !== undefined ? `<p class="vwhy">${ctx.inline(c[longK].text)}</p>` : "") + `</div>` +
        (roles ? `<div class="roles">${roles}</div>` : "") + `</div>`;
    }).join("") + `<div class="verdict rt-none" hidden><div class="vmain"><p class="vwhy">${esc(b.a.kv.none || "No answer is written for this combination.")}</p></div></div></div>`;
    return shell("router", b, ctx, h);
  },
};
