/* timeline runtime — draws the proportional track over the static list (from fbi-cia-nsa.html).
 * Wide screens: a horizontal track with staggered markers and a tick axis.
 * Narrow screens (≤760px): a vertical list, spaced by time, pushed apart where events crowd. */
export function timeline(root) {
  const evs = [...root.querySelectorAll(".tl-ev")].map((li) => ({
    p: parseFloat(li.dataset.p), cls: li.className,
    y: li.querySelector(".tl-y").textContent, s: li.querySelector(".tl-s").textContent,
    t: li.querySelector(".tl-t").innerHTML, b: li.querySelector(".tl-b").innerHTML,
  }));
  if (!evs.length) return;
  const ticks = [...root.querySelectorAll(".tl-ticks span")].map((s) => ({ p: parseFloat(s.dataset.p), label: s.textContent }));
  const today = root.dataset.today ? parseFloat(root.dataset.today) : null;

  const list = root.querySelector(".tl-list");
  const live = document.createElement("div");
  live.className = "tl-live";
  live.innerHTML = '<div class="tl-track"></div><div class="tl-axis"></div>';
  list.after(live);
  list.hidden = true;
  // track, axis, key, then the shared panel
  const panel = document.createElement("div");
  panel.className = "tl-panel";
  panel.setAttribute("role", "region");
  panel.setAttribute("aria-live", "polite");
  panel.innerHTML = '<div class="py"></div><h4></h4><p></p>';
  root.appendChild(panel);
  const track = live.querySelector(".tl-track"), axis = live.querySelector(".tl-axis");
  const first = evs.findIndex((e) => !/\bfuture\b/.test(e.cls));
  let current = Math.max(0, root.querySelector(".tl-ev.next") ? evs.findIndex((e) => /\bnext\b/.test(e.cls)) : first);
  let narrow = null;
  const pct = (p) => (p * 100).toFixed(2) + "%";
  const kindCls = (e) => e.cls.split(/\s+/).filter((c) => /^(k\d|kt|c-[\w-]+|future|next)$/.test(c)).join(" ");

  function dot(e, i) {
    return '<button type="button" class="tl-dot ' + kindCls(e) + '" data-i="' + i + '" aria-label="' + e.y.replace(/"/g, "&quot;") + ": " +
      e.t.replace(/<[^>]*>/g, "").replace(/"/g, "&quot;") + '"></button>';
  }

  function horizontal() {
    track.classList.remove("vert");
    const rows = [0, 78, 156];
    let h = "";
    evs.forEach((e, i) => {
      const left = Math.max(1.5, Math.min(98.5, e.p * 100));
      const top = rows[i % 3];
      h += '<div class="tl-node" data-i="' + i + '" style="left:' + left.toFixed(2) + "%;top:" + top + 'px">' +
        '<div class="tl-stem" style="top:40px;height:' + Math.max(0, 208 - top - 40) + 'px"></div>' + dot(e, i) +
        '<div class="tl-yr">' + e.s + "</div></div>";
    });
    if (today !== null) h += '<div class="tl-today" style="left:' + pct(today) + '"><span>Today</span></div>';
    track.style.height = "230px";
    track.innerHTML = h;
    axis.innerHTML = ticks.map((t, k) => '<span class="tl-tick' + (k === 0 ? " first" : k === ticks.length - 1 ? " last" : "") +
      '" style="left:' + pct(t.p) + '">' + t.label + "</span>").join("");
    axis.style.display = "";
  }

  function vertical() {
    track.classList.add("vert");
    const H = Math.max(420, evs.length * 56), MIN = 62, tops = [];
    evs.forEach((e, i) => {
      let raw = e.p * H;
      if (i > 0 && raw < tops[i - 1] + MIN) raw = tops[i - 1] + MIN;
      tops.push(raw);
    });
    track.innerHTML = evs.map((e, i) => '<div class="tl-node" data-i="' + i + '" style="top:' + tops[i].toFixed(1) + 'px">' + dot(e, i) +
      '<div class="tl-vlab"><span class="vy">' + e.s + "</span>" + e.t + "</div></div>").join("");
    track.style.height = tops[tops.length - 1] + 64 + "px";
    axis.innerHTML = "";
    axis.style.display = "none";
  }

  function show(i) {
    current = i;
    const e = evs[i];
    panel.querySelector(".py").textContent = e.y;
    panel.querySelector("h4").innerHTML = e.t;
    panel.querySelector("p").innerHTML = e.b;
    track.querySelectorAll(".tl-dot").forEach((d, j) => d.classList.toggle("on", j === i));
    track.querySelectorAll(".tl-node").forEach((n, j) => n.classList.toggle("on", j === i));
  }

  function layout() {
    const isNarrow = window.matchMedia("(max-width:760px)").matches;
    if (isNarrow === narrow) return;
    narrow = isNarrow;
    if (isNarrow) vertical(); else horizontal();
    show(current);
  }

  track.addEventListener("click", (ev) => { const d = ev.target.closest(".tl-dot"); if (d) show(+d.dataset.i); });
  track.addEventListener("focusin", (ev) => { const d = ev.target.closest(".tl-dot"); if (d) show(+d.dataset.i); });
  track.addEventListener("keydown", (ev) => {
    if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
    const k = Math.max(0, Math.min(evs.length - 1, current + (ev.key === "ArrowRight" ? 1 : -1)));
    const d = track.querySelector('.tl-dot[data-i="' + k + '"]');
    if (d) { ev.preventDefault(); d.focus(); }
  });
  layout();
  window.addEventListener("resize", layout);
}
