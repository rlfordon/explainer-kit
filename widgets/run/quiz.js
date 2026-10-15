/* quiz runtime — paged (default) or stacked. Answers lock on the first pick; the verdict is
 * spoken in words ("Correct" / "Not quite"), never colour alone. */
export function quiz(root) {
  const items = [...root.querySelectorAll(".qz")];
  const paged = !root.classList.contains("stacked");
  const num = root.querySelector(".qn-num"), score = root.querySelector(".qn-score");
  const done = root.querySelector(".qz-done");
  let qi = 0, right = 0, answered = 0;

  function head() {
    if (paged) num.textContent = qi < items.length ? "Question " + (qi + 1) + " of " + items.length : items.length + " questions";
    score.textContent = "Score " + right + " / " + answered;
  }
  function reset() {
    qi = 0; right = 0; answered = 0;
    items.forEach((it) => {
      it.querySelectorAll(".opt").forEach((o) => { o.disabled = false; o.classList.remove("correct", "wrong"); o.querySelector(".mk").textContent = o.dataset.mk; });
      it.querySelector(".why").hidden = true;
      const nx = it.querySelector(".qz-next"); if (nx) nx.remove();
    });
    show();
  }
  function show() {
    if (paged) items.forEach((it, i) => { it.hidden = i !== qi; });
    done.hidden = !(paged ? qi >= items.length : answered === items.length);
    if (!done.hidden) {
      done.querySelector(".score").textContent = right + " out of " + items.length;
      const msg = done.querySelector(".qz-msg");
      msg.textContent = right === items.length ? msg.dataset.all : right >= items.length * 0.6 ? msg.dataset.most : msg.dataset.few;
    }
    head();
  }
  items.forEach((it, i) => {
    const ans = +it.dataset.answer;
    const opts = [...it.querySelectorAll(".opt")];
    opts.forEach((o) => { o.dataset.mk = o.querySelector(".mk").textContent; });
    opts.forEach((o) => o.addEventListener("click", () => {
      const picked = +o.dataset.i, ok = picked === ans;
      answered++; if (ok) right++;
      opts.forEach((x, j) => {
        x.disabled = true;
        if (j === ans) { x.classList.add("correct"); x.querySelector(".mk").textContent = "✓ " + x.dataset.mk; }
        else if (j === picked) { x.classList.add("wrong"); x.querySelector(".mk").textContent = "✗ " + x.dataset.mk; }
      });
      const why = it.querySelector(".why");
      why.querySelector(".why-h").textContent = ok ? "Correct — here is why" : "Not quite — here is why";
      why.hidden = false;
      if (paged) {
        const row = document.createElement("div");
        row.className = "btnrow qz-next";
        row.innerHTML = '<button type="button" class="btn btn-primary">' + (i === items.length - 1 ? "See results" : "Next question") + "</button>";
        it.appendChild(row);
        row.firstChild.addEventListener("click", () => { qi++; show(); const f = root.querySelector(".qz:not([hidden]) .opt, .qz-done .btn"); if (f) f.focus({ preventScroll: true }); });
      }
      head();
      if (!paged) show();
    }));
  });
  done.querySelector('[data-act="again"]').addEventListener("click", reset);
  root.classList.add("live");
  show();
}
