/* catalog runtime — filter chips, search, a count, and either expanding rows or a list that
 * picks what the detail panel shows. Without it, the static list shows every detail. */
export function catalog(root) {
  const split = root.classList.contains("cat-is-split");
  const modes = (root.dataset.fm || "").split(" ").filter(Boolean);
  const noun = root.dataset.noun || "items";
  const filters = root.querySelector(".cat-filters");
  const countEl = root.querySelector(".cat-count");
  const q = root.querySelector(".cat-q");
  const empty = root.querySelector(".cat-empty");
  const sel = modes.map(() => new Set());
  if (filters) filters.hidden = false;
  if (countEl) countEl.hidden = false;

  const items = [...root.querySelectorAll(split ? ".cat-li" : ".cat-row")];
  const arts = split ? new Map([...root.querySelectorAll(".cat-art")].map((a) => [a.dataset.i, a])) : null;
  const has = items.map((el) => modes.map((_, g) => new Set((el.dataset["f" + g] || "").split(" ").filter(Boolean))));
  const text = items.map((el) => ((split ? arts.get(el.dataset.i) : el) || el).textContent.toLowerCase());
  let current = split && items.length ? items[0].dataset.i : null;

  root.classList.add("cat-live");
  if (split) {
    root.querySelector(".cat-side").hidden = false;
  } else {
    for (const b of root.querySelectorAll("button.cat-rb")) {
      const det = document.getElementById(b.getAttribute("aria-controls"));
      b.setAttribute("aria-expanded", "false");
      if (det) det.hidden = true;
      b.addEventListener("click", () => {
        const open = b.getAttribute("aria-expanded") !== "true";
        b.setAttribute("aria-expanded", String(open));
        if (det) det.hidden = !open;
      });
    }
  }

  function matches(i) {
    for (let g = 0; g < modes.length; g++) {
      if (!sel[g].size) continue;
      const want = [...sel[g]];
      if (modes[g] === "all" ? !want.every((v) => has[i][g].has(v)) : !want.some((v) => has[i][g].has(v))) return false;
    }
    const terms = q ? q.value.toLowerCase().trim().split(/\s+/).filter(Boolean) : [];
    return terms.every((t) => text[i].includes(t));
  }

  function render() {
    let shown = 0;
    const vis = items.map((el, i) => { const ok = matches(i); el.hidden = !ok; if (ok) shown++; return ok; });
    // group headings follow their items
    for (const gEl of root.querySelectorAll(split ? ".cat-ih" : ".cat-grp")) {
      const g = gEl.dataset.grp;
      gEl.hidden = !items.some((el, i) => vis[i] && (split ? el.dataset.grp === g : gEl.contains(el)));
    }
    if (countEl) {
      const all = modes.some((m, g) => m === "all" && sel[g].size > 1);
      countEl.textContent = `Showing ${shown} of ${items.length} ${noun}${all ? " that have every value chosen" : ""}`;
    }
    if (empty) empty.hidden = shown > 0;
    if (split) {
      if (!items.some((el, i) => vis[i] && el.dataset.i === current)) {
        const first = items.find((el, i) => vis[i]);
        current = first ? first.dataset.i : null;
      }
      items.forEach((el) => el.querySelector(".cat-pick").setAttribute("aria-current", String(el.dataset.i === current)));
      arts.forEach((a, i) => { a.hidden = i !== current; });
    }
  }

  if (filters) filters.addEventListener("click", (e) => {
    const b = e.target.closest(".cat-chip");
    if (!b) return;
    const g = +b.dataset.g, v = b.dataset.v;
    if (modes[g] === "one") {
      sel[g].clear();
      if (v !== "all") sel[g].add(v);
      filters.querySelectorAll(`.cat-chip[data-g="${g}"]`).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    } else {
      if (sel[g].has(v)) sel[g].delete(v); else sel[g].add(v);
      b.setAttribute("aria-pressed", String(sel[g].has(v)));
    }
    render();
  });
  if (q) q.addEventListener("input", render);

  if (split) root.querySelector(".cat-index").addEventListener("click", (e) => {
    const b = e.target.closest(".cat-pick");
    if (!b) return;
    current = b.dataset.i;
    render();
    if (window.matchMedia("(max-width:900px)").matches) {
      const a = arts.get(current);
      if (a) a.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth" });
    }
  });

  render();
}
