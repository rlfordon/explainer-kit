/* checklist runtime — count, and (file target only) remember ticks in localStorage. */
export function checklist(root) {
  const boxes = [...root.querySelectorAll('input[type="checkbox"]')];
  const count = root.querySelector(".ck-count");
  const key = "explainer-checklist:" + root.dataset.key;
  const persist = root.dataset.persist === "1";
  if (persist) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "null");
      if (Array.isArray(saved)) boxes.forEach((b, i) => { b.checked = saved.includes(i); });
    } catch (e) { /* storage unavailable: ticks last for this view */ }
  }
  function update() {
    const n = boxes.filter((b) => b.checked).length;
    count.textContent = n + " of " + boxes.length + " done";
    boxes.forEach((b) => b.closest("li").classList.toggle("done", b.checked));
    if (persist) {
      try { localStorage.setItem(key, JSON.stringify(boxes.map((b, i) => (b.checked ? i : -1)).filter((i) => i >= 0))); } catch (e) { /* ignore */ }
    }
  }
  boxes.forEach((b) => b.addEventListener("change", update));
  update();
}
