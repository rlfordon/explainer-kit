/* calc runtime — read the controls, recompute the lets, refresh every formula. */
import { compile, fmt } from "../../lib/expr.js";
import { live } from "../../lib/live.js";

export function calc(root) {
  const ranges = [...root.querySelectorAll('input[type="range"][data-n]')];
  const segs = [...root.querySelectorAll(".seg[data-n]")];
  const lets = [...root.querySelectorAll(".cx-let")];
  const names = [...ranges.map((r) => r.dataset.n), ...segs.map((s) => s.dataset.n), ...lets.map((l) => l.dataset.n)];
  const letFns = lets.map((l) => { try { return [l.dataset.n, compile(l.dataset.l, names)]; } catch (e) { return [l.dataset.n, null]; } });
  const meters = [...root.querySelectorAll(".cx-fill[data-m]")].map((el) => {
    const c = (s) => { try { return compile(s, names); } catch (e) { return null; } };
    return { el, m: c(el.dataset.m), o: el.dataset.o ? c(el.dataset.o) : null };
  });
  const update = live(root, names);

  const valueOf = (r) => {
    const pos = +r.value;
    if (!r.dataset.log) return pos;
    const v = 10 ** pos;
    return +r.dataset.min >= 1 ? Math.round(v) : +v.toPrecision(3);
  };
  const segValue = (b) => (b.dataset.s ? b.dataset.v : +b.dataset.v);

  function render() {
    const scope = new Map();
    for (const r of ranges) {
      const v = valueOf(r);
      scope.set(r.dataset.n, v);
      const out = r.parentElement.querySelector(".cx-out");
      if (out) out.textContent = fmt(v, r.dataset.f || "");
    }
    for (const s of segs) {
      const b = s.querySelector('button[aria-pressed="true"]') || s.querySelector("button");
      scope.set(s.dataset.n, b ? segValue(b) : NaN);
    }
    for (const [n, f] of letFns) scope.set(n, f ? f.run(scope) : NaN);
    update(scope);
    for (const { el, m, o } of meters) {
      const v = m ? +m.run(scope) : 0;
      el.style.width = (Math.min(Math.max(Number.isFinite(v) ? v : 0, 0), 1) * 100).toFixed(1) + "%";
      el.classList.toggle("over", Boolean(o && o.run(scope)));
    }
  }

  for (const r of ranges) r.addEventListener("input", render);
  for (const s of segs) s.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    s.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    render();
  });
  for (const p of root.querySelectorAll(".cx-presets [data-set]")) p.addEventListener("click", () => {
    for (const pair of p.dataset.set.split(";")) {
      const [n, raw] = pair.split("=");
      const r = ranges.find((x) => x.dataset.n === n);
      if (r) {
        let v;
        try { v = +compile(raw, []).run(new Map()); } catch (e) { continue; }
        r.value = r.dataset.log ? Math.log10(Math.max(v, 1e-12)) : v;
        continue;
      }
      const s = segs.find((x) => x.dataset.n === n);
      if (s) s.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.v === raw)));
    }
    render();
  });
  render();
}
