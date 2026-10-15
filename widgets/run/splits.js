/* splits runtime — generates the seeded items from the spec, applies the chosen fixes, and
 * redraws the split matrix, the win counts and the findings. Names reach the page only as
 * textContent. */
import { rng } from "../../lib/rand.js";

export function splits(root) {
  const box = root.querySelector(".sp");
  if (!box) return;
  let spec;
  try { spec = JSON.parse(box.dataset.spec || "{}"); } catch (e) { return; }
  const cats = Array.isArray(spec.cats) ? spec.cats.filter((c) => typeof c === "string").slice(0, 40) : [];
  if (cats.length < 2) return;
  const escape = typeof spec.escape === "string" ? spec.escape : "";

  // the items, exactly as the original demo made them: pick an alternative (one draw, only
  // when there is a choice), noise for every category, then each entry's a + r·b; normalise
  const r = rng(spec.seed | 0), items = [];
  for (const g of Array.isArray(spec.groups) ? spec.groups : []) {
    const alts = Array.isArray(g.alts) && g.alts.length ? g.alts : [[]];
    const n = Math.min(2000, Math.max(0, g.n | 0));
    for (let i = 0; i < n && items.length < 2000; i++) {
      const alt = alts.length > 1 ? alts[Math.min(alts.length - 1, Math.floor(r() * alts.length))] : alts[0];
      const v = cats.map(() => 0.01 + r() * 0.03);
      for (const e of alt) {
        const k = cats.indexOf(e[0]);
        const add = Number(e[1]) + r() * Number(e[2]);
        if (k >= 0 && Number.isFinite(add)) v[k] += add;
      }
      const z = v.reduce((a, b) => a + b, 0);
      items.push(v.map((x) => x / z));
    }
  }
  const fixes = Array.isArray(spec.fixes) ? spec.fixes : [];
  const applied = fixes.map(() => false);

  const slider = root.querySelector(".sp-margin"), out = root.querySelector(".sp-ctrl output");
  const mx = root.querySelector(".sp-mx"), winsBox = root.querySelector(".sp-wins"), find = root.querySelector(".sp-find");
  const fixBtns = [...root.querySelectorAll(".sp-fix")];
  const stat = root.querySelector(".sp-static");
  if (stat) stat.hidden = true;

  function current() {
    let C = cats.slice();
    const map = {};
    cats.forEach((c) => { map[c] = c; });
    fixes.forEach((f, i) => {
      if (!applied[i] || !Array.isArray(f.from)) return;
      const src = f.from.filter((s) => C.includes(s));
      if (!src.length || typeof f.to !== "string" || !f.to) return;
      if (C.includes(f.to)) C = C.filter((c) => c === f.to || !src.includes(c));
      else { const at = C.indexOf(src[0]); C = C.map((c, k) => (k === at ? f.to : c)).filter((c) => !src.includes(c) || c === f.to); }
      for (const k of cats) if (src.includes(map[k])) map[k] = f.to;
    });
    return { C, map };
  }
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  function draw() {
    const mg = Number(slider.value);
    out.textContent = mg.toFixed(2);
    const { C, map } = current();
    const n = C.length, pair = {}, wins = {};
    C.forEach((c) => { wins[c] = 0; });
    for (const v of items) {
      const o = {};
      cats.forEach((c, i) => { o[map[c]] = (o[map[c]] || 0) + v[i]; });
      const srt = C.slice().sort((a, b) => o[b] - o[a]);
      wins[srt[0]]++;
      if (o[srt[0]] - o[srt[1]] < mg) {
        const k = [srt[0], srt[1]].sort((a, b) => C.indexOf(a) - C.indexOf(b)).join("|");
        pair[k] = (pair[k] || 0) + 1;
      }
    }

    mx.textContent = "";
    mx.style.setProperty("--n", n);
    const row = () => { const r2 = el("div", "sp-row"); r2.setAttribute("role", "row"); mx.appendChild(r2); return r2; };
    const hr = row();
    hr.appendChild(el("div", "sp-cell sp-h"));
    C.forEach((c) => { const h = el("div", "sp-cell sp-hc", c); h.setAttribute("role", "columnheader"); hr.appendChild(h); });
    const maxv = Math.max(1, ...Object.values(pair));
    C.forEach((a, i) => {
      const tr = row();
      const rh = el("div", "sp-cell sp-h", a);
      rh.setAttribute("role", "rowheader");
      tr.appendChild(rh);
      C.forEach((b2, j) => {
        if (j <= i) { const e = el("div", "sp-cell sp-x"); e.setAttribute("role", "cell"); tr.appendChild(e); return; }
        const v = pair[a + "|" + b2] || 0, t = v / maxv;
        const cell = el("div", "sp-cell sp-c" + (v ? " on" : "") + (t > 0.45 ? " hot" : ""), v ? String(v) : "");
        cell.setAttribute("role", "cell");
        cell.setAttribute("aria-label", a + " and " + b2 + ": " + v + " split" + (v === 1 ? "" : "s"));
        if (v) cell.style.background = "color-mix(in srgb, var(--accent) " + Math.round((0.12 + 0.88 * t) * 100) + "%, var(--surface-2))";
        tr.appendChild(cell);
      });
    });

    winsBox.textContent = "";
    winsBox.appendChild(el("div", "sp-lab", "Times each category won (of " + items.length + ")"));
    const mw = Math.max(1, ...C.map((c) => wins[c]));
    C.forEach((c) => {
      const dead = wins[c] <= 1 && c !== escape;
      const row = el("div", "sp-win" + (dead ? " dead" : ""));
      row.appendChild(el("span", "sp-wn", c));
      const bar = el("span", "sp-bar");
      bar.style.width = Math.max(2, (wins[c] / mw) * 100) + "%";
      const track = el("span", "sp-track");
      track.appendChild(bar);
      row.appendChild(track);
      row.appendChild(el("span", "sp-wc", String(wins[c])));
      winsBox.appendChild(row);
    });

    find.textContent = "";
    const li = (bold, rest) => { const l = el("li"); l.appendChild(el("b", null, bold)); l.appendChild(document.createTextNode(rest)); find.appendChild(l); };
    Object.keys(pair).sort((a, b) => pair[b] - pair[a]).slice(0, 2).forEach((k) => {
      if (pair[k] >= 4) li(k.replace("|", " / "), " split on " + pair[k] + " of " + items.length + " items. Sharpen the definitions or merge them.");
    });
    C.forEach((c) => {
      if (wins[c] <= 1 && c !== escape) li(c, " won " + wins[c] + " time" + (wins[c] === 1 ? "" : "s") + ". It is either rare in this sample or absorbed by a neighbour.");
    });
    if (escape && C.includes(escape)) li(escape, " won " + wins[escape] + " of " + items.length + ". A high rate would point to a missing category.");
    fixBtns.forEach((b2) => { b2.disabled = !!applied[+b2.dataset.i]; });
  }

  slider.addEventListener("input", draw);
  fixBtns.forEach((b2) => b2.addEventListener("click", () => { applied[+b2.dataset.i] = true; draw(); }));
  const reset = root.querySelector(".sp-reset");
  if (reset) reset.addEventListener("click", () => { applied.fill(false); draw(); });
  draw();
}
