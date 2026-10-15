/* triage runtime — move the thresholds or switch scenario; dots, bands, counts and every
 * formula follow. */
import { compile } from "../../lib/expr.js";
import { live } from "../../lib/live.js";

const VARS = ["low", "mid", "high", "total", "lowGood", "lowBad", "midGood", "midBad", "highGood", "highBad", "lo", "hi"]; // as widgets/triage.js

export function triage(root) {
  const keys = (root.dataset.classes || "").split(" ");
  const incl = root.dataset.incl === "1";
  const plot = root.querySelector(".tg-plot");
  const dots = [...plot.querySelectorAll(".tg-dot")].map((el) => ({ el, p: +el.dataset.p, c: +el.dataset.c, good: el.dataset.g === "1" }));
  const lo = root.querySelector('input[data-t="lo"]'), hi = root.querySelector('input[data-t="hi"]');
  const scenBtns = [...root.querySelectorAll(".tg-scen button")];
  const compiled = new Map();
  const scaleOf = (src) => {
    if (!compiled.has(src)) { try { compiled.set(src, compile(src, ["p", "class"])); } catch (e) { compiled.set(src, null); } }
    return compiled.get(src);
  };
  const one = root.querySelector(".tg-scen-one");
  let scen = scenBtns.length ? scaleOf(scenBtns[0].dataset.s) : one ? scaleOf(one.dataset.s) : null;
  const update = live(root, VARS);
  const bands = { low: plot.querySelector(".tg-band.low"), mid: plot.querySelector(".tg-band.mid"), high: plot.querySelector(".tg-band.high") };
  const lines = { lo: plot.querySelector(".tg-line.lo"), hi: plot.querySelector(".tg-line.hi") };
  const stack = root.querySelector(".tg-stack");
  const pct = (v) => (Math.min(Math.max(v, 0), 1) * 100).toFixed(2) + "%";

  function render(src) {
    let a = +lo.value, b = +hi.value;
    if (a > b) { if (src === lo) { hi.value = a; b = +hi.value; } else { lo.value = b; a = +lo.value; } }
    lo.parentElement.querySelector(".cx-out").textContent = a.toFixed(2);
    hi.parentElement.querySelector(".cx-out").textContent = b.toFixed(2);
    const s = { low: 0, mid: 0, high: 0, lowGood: 0, lowBad: 0, midGood: 0, midBad: 0, highGood: 0, highBad: 0, total: dots.length, lo: a, hi: b };
    const scope = new Map();
    for (const d of dots) {
      let p = d.p;
      if (scen) {
        scope.set("p", d.p); scope.set("class", keys[d.c] || "");
        const v = +scen.run(scope);
        p = Number.isFinite(v) ? Math.min(Math.max(v, 0), 1) : 0;
      }
      const z = p >= b ? "high" : (incl ? p <= a : p < a) ? "low" : "mid";
      s[z]++; s[z + (d.good ? "Good" : "Bad")]++;
      d.el.style.left = pct(p);
      d.el.classList.toggle("mid", z === "mid");
      d.el.classList.toggle("err", (z === "high" && !d.good) || (z === "low" && d.good));
    }
    const setBand = (el, x0, x1) => {
      el.style.left = pct(x0); el.style.width = pct(x1 - x0);
      const lab = el.querySelector("span");
      if (lab) lab.hidden = (x1 - x0) < 0.13;
    };
    setBand(bands.low, 0, a); setBand(bands.mid, a, b); setBand(bands.high, b, 1);
    lines.lo.style.left = pct(a); lines.hi.style.left = pct(b);
    if (stack) ["low", "mid", "high"].forEach((z) => { stack.querySelector("." + z).style.width = pct(s[z] / s.total); });
    plot.setAttribute("aria-label", `${s.total} items by score: ${s.low} in the low zone, ${s.mid} between, ${s.high} in the high zone`);
    update(new Map(Object.entries(s)));
  }

  lo.addEventListener("input", () => render(lo));
  hi.addEventListener("input", () => render(hi));
  for (const btn of scenBtns) btn.addEventListener("click", () => {
    scenBtns.forEach((x) => x.setAttribute("aria-pressed", String(x === btn)));
    scen = scaleOf(btn.dataset.s);
    render();
  });
  render();
}
