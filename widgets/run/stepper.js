/* stepper runtime — one stage at a time, Next/Back, a progress rail, track buttons. */
export function stepper(root) {
  const tracks = [...root.querySelectorAll(".st-track")];
  const wires = [...root.querySelectorAll(".wire")];
  const rail = root.querySelector(".rail");
  const row = root.querySelector(".btnrow");
  const next = row.querySelector('[data-act="next"]'), back = row.querySelector('[data-act="back"]');
  const count = row.querySelector(".stepcount");
  const nextLabel = next.textContent;
  let T = 0, S = 0;
  rail.hidden = false;
  row.hidden = false;
  root.classList.add("live");

  function render() {
    const stages = tracks[T].querySelectorAll(".stage");
    const n = stages.length;
    tracks.forEach((t, i) => { t.hidden = i !== T; });
    stages.forEach((s, i) => { s.hidden = i !== S; });
    rail.querySelectorAll(".rl").forEach((r, i) => r.classList.toggle("on", i <= S));
    wires.forEach((w, i) => w.setAttribute("aria-pressed", String(i === T)));
    count.textContent = S + 1 + " / " + n;
    back.disabled = S === 0;
    next.textContent = S === n - 1 ? "Start over" : nextLabel;
  }
  next.addEventListener("click", () => {
    const n = tracks[T].querySelectorAll(".stage").length;
    S = S === n - 1 ? 0 : S + 1;
    render();
  });
  back.addEventListener("click", () => { if (S > 0) { S--; render(); } });
  wires.forEach((w) => w.addEventListener("click", () => { T = +w.dataset.t; S = 0; render(); }));
  render();
}
