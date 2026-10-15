/* tree runtime — walks the static nested list: question, answer buttons, the path so far,
 * and the outcome. Clicking a step in the path goes back to it. */
export function tree(root) {
  const stat = root.querySelector(".tree-static");
  const live = document.createElement("div");
  live.className = "tree-live";
  live.setAttribute("aria-live", "polite");
  stat.after(live);
  stat.hidden = true;
  const start = stat.querySelector(":scope > .tq");
  let path = []; // [{q: li.tq, a: li.ta}]

  function answersOf(q) { return [...q.querySelectorAll(":scope > .ta-list > .ta")]; }
  function render() {
    const at = path.length ? path[path.length - 1].a : null;
    const q = at ? at.querySelector(":scope > .tq-list > .tq") : start;
    const out = at ? at.querySelector(":scope > .tout") : null;
    let h = "";
    if (path.length) {
      h += '<ol class="tpath">' + path.map((s, i) =>
        '<li><button type="button" class="tp" data-i="' + i + '"><span class="tp-q">' + s.q.querySelector(":scope > .tq-t").innerHTML +
        '</span><span class="tp-a">' + s.a.querySelector(":scope > .ta-t").innerHTML + "</span></button></li>").join("") + "</ol>";
    }
    if (out) {
      h += '<div class="tcard tdone"><div class="tlab">Where this leads</div><div class="tbody">' + out.innerHTML + "</div>" +
        '<div class="btnrow"><button type="button" class="btn btn-ghost" data-act="restart">Start over</button></div></div>';
    } else if (q) {
      h += '<div class="tcard"><div class="tlab">Question ' + (path.length + 1) + '</div><div class="tq-now">' +
        q.querySelector(":scope > .tq-t").innerHTML + '</div><div class="topts">' +
        answersOf(q).map((a, k) => '<button type="button" class="btn btn-choice" data-k="' + k + '">' + a.querySelector(":scope > .ta-t").innerHTML + "</button>").join("") +
        "</div></div>";
    }
    live.innerHTML = h;
    live.querySelectorAll(".btn-choice").forEach((btn) => btn.addEventListener("click", () => {
      path.push({ q, a: answersOf(q)[+btn.dataset.k] });
      render();
      const f = live.querySelector(".btn-choice, .btn");
      if (f) f.focus({ preventScroll: true });
    }));
    live.querySelectorAll(".tp").forEach((btn) => btn.addEventListener("click", () => { path = path.slice(0, +btn.dataset.i); render(); }));
    const rs = live.querySelector('[data-act="restart"]');
    if (rs) rs.addEventListener("click", () => { path = []; render(); });
  }
  render();
}
