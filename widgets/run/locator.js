/* locator runtime — scores every passage for the chosen question, draws the meters, and
 * re-scores as sentences are removed. Data comes from the rendered HTML (escaped attributes
 * and the sentences' own text); the weights are matched as plain substrings. */
export function locator(root) {
  const box = root.querySelector(".lc");
  if (!box) return;
  const temp = Number(box.dataset.temp) > 0 ? Number(box.dataset.temp) : 2.5;
  let mode = box.dataset.mode === "absolute" ? "absolute" : "relative";
  const qBtns = [...root.querySelectorAll(".lc-q")];
  const qs = qBtns.map((b) => {
    let w = [];
    try { w = JSON.parse(b.dataset.wt || "[]"); } catch (e) { w = []; }
    w = Array.isArray(w) ? w.filter((x) => Array.isArray(x) && typeof x[0] === "string" && x[0] && Number.isFinite(x[1])) : [];
    const n = (v, d) => (Number.isFinite(Number(v)) ? Number(v) : d);
    return { w, bias: n(b.dataset.bias, 2.5), none: n(b.dataset.none, 2) };
  });
  const paras = [...root.querySelectorAll(".lc-p")].map((p) => ({
    el: p, meter: p.querySelector(".lc-m"),
    sents: [...p.querySelectorAll(".lc-s")].map((s) => ({ el: s, text: s.textContent.toLowerCase(), gone: false })),
  }));
  const noneLine = root.querySelector(".lc-none");
  let qi = 0;

  function raw(p, all) {
    const w = qs[qi].w;
    let t = 0;
    for (const s of p.sents) {
      if (!all && s.gone) continue;
      for (const [ph, v] of w) if (s.text.includes(ph)) t += v;
    }
    return t;
  }
  function probs(all) {
    const r = paras.map((p) => raw(p, all)), Q = qs[qi];
    if (mode === "absolute") return { p: r.map((x) => 1 / (1 + Math.exp(-(x - Q.bias)))), none: null };
    const e = r.map((x) => Math.exp(x / temp)), en = Math.exp(Q.none / temp);
    const z = en + e.reduce((a, b) => a + b, 0);
    return { p: e.map((x) => x / z), none: en / z };
  }
  function draw() {
    const now = probs(false), base = probs(true);
    const top = now.p.indexOf(Math.max(...now.p));
    paras.forEach((para, i) => {
      const p = now.p[i], d = p - base.p[i];
      para.el.classList.toggle("top", i === top && (now.none === null || p > now.none));
      const delta = Math.abs(d) >= 0.01 ? ` <span class="lc-d${d > 0 ? " up" : ""}">${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(2)}</span>` : "";
      para.meter.innerHTML = `<div class="lc-track"><div class="lc-fill" style="width:${(p * 100).toFixed(1)}%"></div></div>${p.toFixed(2)}${delta}`;
      for (const s of para.sents) {
        s.el.classList.toggle("gone", s.gone);
        s.el.setAttribute("aria-pressed", String(s.gone));
        s.el.setAttribute("aria-label", (s.gone ? "Restore: " : "Remove: ") + s.el.textContent);
      }
    });
    noneLine.textContent = now.none === null
      ? "Each passage is scored on its own, so the values do not sum to 1."
      : "The values sum to 1 across the passages plus a “none of these” option, now at " + now.none.toFixed(2) + ".";
  }

  qBtns.forEach((b, i) => b.addEventListener("click", () => {
    qi = i;
    qBtns.forEach((x, j) => x.setAttribute("aria-pressed", String(j === i)));
    draw();
  }));
  root.querySelectorAll(".lc-mode button").forEach((b) => b.addEventListener("click", () => {
    mode = b.dataset.m === "absolute" ? "absolute" : "relative";
    root.querySelectorAll(".lc-mode button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    draw();
  }));
  paras.forEach((p) => p.sents.forEach((s) => s.el.addEventListener("click", () => { s.gone = !s.gone; draw(); })));
  const restore = root.querySelector(".lc-restore");
  if (restore) restore.addEventListener("click", () => { paras.forEach((p) => p.sents.forEach((s) => { s.gone = false; })); draw(); });
  draw();
}
