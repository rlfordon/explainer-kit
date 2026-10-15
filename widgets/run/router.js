/* router runtime — segmented controls pick which verdict is shown. */
export function router(root) {
  const segs = [...root.querySelectorAll(".seg")];
  const state = segs.map(() => 0);
  const vs = [...root.querySelectorAll(".rt-v")];
  const none = root.querySelector(".rt-none");
  function render() {
    const key = state.join("|");
    let hit = false;
    vs.forEach((v) => { const on = !hit && v.dataset.key === key; if (on) hit = true; v.hidden = !on; });
    none.hidden = hit;
  }
  segs.forEach((seg, ai) => seg.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === btn)));
    state[ai] = +btn.dataset.v;
    render();
  }));
  render();
}
