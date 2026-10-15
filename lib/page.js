/* page.js — source text → page HTML. Shared by the build (file target) and the link viewer.
 *
 * Page shape:  front matter → nav + hero (hero: dark gives it a dark band; eyebrow: a line above the title);  blocks before the first ## → hero extras;
 *              each ## → a section ("§01 · label" eyebrow, alternating bands);
 *              a paragraph that is only "|" splits a section into columns.
 * Section heading attributes: {#id nav="Short label" .band .dark .plain .split-head cols="1.2 1"}
 *              .sources on a section styles its list as a source list and skips the number.
 * Modes:      "file" — raw `html`, `style` and `demo` fences pass through (trusted author).
 *             "link" — they never do: a link is text anyone can write, so the viewer renders
 *                      only what the widgets and this file produce, every string escaped.
 */
import { parse, inline, plain, esc, slug, cleanId, cleanClass, attrHtml, cellOf, quoteParas } from "./md.js";
import { topicColors } from "./theme.js";
import { WIDGETS } from "./widgets.js";

const RAW = ["html", "style", "demo"];

export function makeCtx(head, mode) {
  const ctx = {
    mode, head,
    colors: topicColors(head),
    warnings: [],
    used: new Set(),
    styles: [],
    ids: new Set(),
    n: 0,
  };
  ctx.inline = (s) => inline(s, ctx);
  ctx.warn = (msg) => ctx.warnings.push(msg);
  ctx.uid = (p) => `${p}-${++ctx.n}`;
  ctx.id = (want) => {
    let id = cleanId(want) || "x";
    let k = 2;
    while (ctx.ids.has(id)) id = `${cleanId(want)}-${k++}`;
    ctx.ids.add(id);
    return id;
  };
  ctx.markdown = (src) => renderBlocks(parse(src).blocks, ctx);
  ctx.paras = (arr) => arr.map((p) => `<p>${ctx.inline(p)}</p>`).join("");
  return ctx;
}

/* ---------- generic blocks ---------- */

export function renderBlocks(blocks, ctx, opt = {}) {
  let out = "";
  for (const b of blocks) out += renderBlock(b, ctx, opt);
  return out;
}

function renderBlock(b, ctx, opt) {
  switch (b.k) {
    case "p": {
      if (b.text.trim() === "|") return "";
      return `<p${attrHtml(b.a)}>${ctx.inline(b.text)}</p>`;
    }
    case "h": {
      const lvl = Math.min(6, Math.max(3, b.level));
      return `<h${lvl}${attrHtml(b.a)}>${ctx.inline(b.text)}</h${lvl}>`;
    }
    case "quote":
      return `<blockquote${attrHtml(b.a)}>${quoteParas(b.text.split("\n")).map((p) => `<p>${ctx.inline(p)}</p>`).join("")}</blockquote>`;
    case "hr": return "";
    case "list": return renderList(b.items, ctx, opt.listClass);
    case "table": return renderTable(b, ctx);
    case "fence": return renderFence(b, ctx);
  }
  return "";
}

export function renderList(items, ctx, cls) {
  if (!items.length) return "";
  const ord = items[0].ord;
  const tag = ord ? "ol" : "ul";
  let h = `<${tag}${cls ? ` class="${esc(cls)}"` : ""}>`;
  for (const it of items) {
    const box = it.done === null ? "" : `<span class="tick${it.done ? " on" : ""}" aria-hidden="true"></span>`;
    h += `<li${attrHtml(it.a)}>${box}${ctx.inline(it.text)}${ctx.paras(it.paras)}` +
      (it.quote.length ? `<blockquote>${ctx.paras(quoteParas(it.quote))}</blockquote>` : "") +
      renderList(it.children, ctx) + `</li>`;
  }
  return h + `</${tag}>`;
}

/* Tables: a {.compare} table makes its first column row headers; a header cell may carry
 * {.topic} to take that topic's colour. Cells are inline Markdown. */
export function renderTable(b, ctx) {
  const cls = (b.a && b.a.cls) || [];
  const compare = cls.includes("compare");
  const extra = cls.filter((c) => c !== "compare").map(cleanClass);
  const n = b.cols.length;
  let h = `<div class="tablewrap${extra.length ? " " + esc(extra.join(" ")) : ""}"${b.a && b.a.id ? ` id="${esc(cleanId(b.a.id))}"` : ""}>` +
    `<table class="${compare ? "cmp" : "data"}" style="min-width:${Math.min(820, n * 170)}px"><thead><tr>`;
  b.cols.forEach((c, k) => {
    const topic = c.a && c.a.cls.find((x) => ctx.colors[x]);
    const label = c.name ? ctx.inline(c.name) : "";
    h += `<th scope="col"${topic ? ` class="h-c c-${esc(topic)}"` : ""}>${k === 0 && compare ? `<span class="note">${label}</span>` : label}</th>`;
  });
  h += `</tr></thead><tbody>`;
  for (const row of b.rows) {
    h += "<tr>";
    for (let k = 0; k < n; k++) {
      const cell = cellOf(row[k] ?? "");
      const inner = ctx.inline(cell.text);
      h += k === 0 && compare ? `<th scope="row">${inner}</th>` : `<td${attrHtml(cell.a)}>${inner}</td>`;
    }
    h += "</tr>";
  }
  return h + `</tbody></table></div>`;
}

function renderFence(b, ctx) {
  const lang = b.lang;
  if (RAW.includes(lang)) {
    if (ctx.mode === "link") {
      if (lang === "style") { ctx.warn("link: a `style` fence is dropped; the viewer uses the page theme only"); return ""; }
      ctx.warn(`link: a \`${lang}\` fence is shown as a placeholder; it runs only in the file target`);
      const t = b.a && b.a.kv.title;
      return `<div class="omitted"><b>${t ? esc(t) : "Interactive demo"}</b>This part of the page runs only in the full version of this explainer.</div>`;
    }
    if (lang === "style") { ctx.styles.push(b.body); return ""; }
    if (lang === "html") return b.body;
    const t = b.a && b.a.kv.title, hint = b.a && b.a.kv.hint;
    return `<div class="demo"${b.a && b.a.id ? ` id="${esc(cleanId(b.a.id))}"` : ""}>` +
      (t ? `<div class="demo-head"><h3>${ctx.inline(t)}</h3>${hint ? `<span class="hint">${ctx.inline(hint)}</span>` : ""}</div>` : "") +
      `<div class="demo-body">${b.body}</div></div>`;
  }
  const w = WIDGETS[lang];
  if (w) {
    ctx.used.add(lang);
    try { return w.render(b, ctx); }
    catch (e) { ctx.warn(`${lang}: could not render (${e.message})`); return ""; }
  }
  if (lang && !/^(text|txt|js|javascript|json|python|py|sh|bash|html|css|md|markdown|sql|yaml|ts|http)$/.test(lang)) {
    ctx.warn(`unknown widget \`${lang}\` — rendered as a code block`);
  }
  return `<pre class="code"${lang ? ` data-lang="${esc(cleanClass(lang))}"` : ""}><code>${esc(b.body)}</code></pre>`;
}

/* ---------- the page ---------- */

export function renderPage(src, { mode = "file" } = {}) {
  const doc = parse(src);
  const head = doc.head;
  const ctx = makeCtx(head, mode);

  // split into hero blocks and sections
  const heroBlocks = [];
  const sections = [];
  let title = head.title || "";
  for (const b of doc.blocks) {
    if (b.k === "h" && b.level === 1 && !sections.length) { if (!title) title = b.text; continue; }
    if (b.k === "h" && b.level === 2) { sections.push({ h: b, blocks: [] }); continue; }
    (sections.length ? sections[sections.length - 1].blocks : heroBlocks).push(b);
  }
  if (!title) ctx.warn("no title: add `title:` to the front matter");

  // section ids and nav labels first, so in-page links resolve
  let num = 0, bandFlip = false;
  const secs = sections.map((s) => {
    const a = s.h.a || { id: "", cls: [], kv: {} };
    const isSources = a.cls.includes("sources");
    const id = ctx.id(a.id || slug(a.kv.nav || plain(s.h.text)));
    const label = a.kv.nav || (isSources ? "Sources" : plain(s.h.text));
    const numbered = !isSources && a.kv.num !== "no";
    if (numbered) num++;
    let tone = a.cls.includes("dark") ? "dark" : a.cls.includes("band") ? "band" : a.cls.includes("plain") ? "" : (bandFlip ? "band" : "");
    bandFlip = !bandFlip;
    if (a.cls.includes("dark")) bandFlip = false;
    return { ...s, a, id, label, numbered, num, tone, isSources };
  });

  const nav = secs.filter((s) => s.a.kv.nav !== "no")
    .map((s) => `<a href="#${esc(s.id)}">${esc(s.label)}</a>`).join("");
  const brand = head.brand || plain(title);
  let html = `<a class="skip" href="#main">Skip to content</a>\n` +
    `<nav class="nav" aria-label="Sections"><div class="wrap"><span class="brand">${ctx.inline(brand)}</span>` +
    `<div class="links">${nav}</div></div></nav>\n`;

  const meta = String(head.meta || "").split(/\|/.test(head.meta || "") ? "|" : "·").map((s) => s.trim()).filter(Boolean);
  html += `<header class="hero${head.hero === "dark" ? " dark" : ""}"><div class="wrap hero-anim">` +
    (head.eyebrow ? `<p class="eyebrow">${ctx.inline(head.eyebrow)}</p>` : "") +
    `<h1>${ctx.inline(title)}</h1>` +
    (head.dek ? `<p class="dek">${ctx.inline(head.dek)}</p>` : "") +
    renderBlocks(heroBlocks, ctx) +
    (meta.length || head.by ? `<div class="meta">${head.by ? `<span>${ctx.inline(head.by)}</span>` : ""}${meta.map((m) => `<span>${ctx.inline(m)}</span>`).join("")}</div>` : "") +
    `</div></header>\n<main id="main" tabindex="-1">\n`;

  for (const s of secs) html += renderSection(s, ctx) + "\n";
  html += `</main>\n`;
  if (head.foot) html += `<footer class="pagefoot"><div class="wrap"><p>${ctx.inline(head.foot)}</p></div></footer>\n`;

  return { html, title: plain(title), head, warnings: ctx.warnings, used: [...ctx.used], styles: ctx.styles, description: head.description || plain(head.dek || "") };
}

function renderSection(s, ctx) {
  const a = s.a;
  const cls = ["section", s.tone, ...a.cls.filter((c) => !["band", "dark", "plain"].includes(c)).map(cleanClass)].filter(Boolean);
  const eyebrow = s.numbered
    ? `<p class="eyebrow"><span>§${String(s.num).padStart(2, "0")}</span>${a.kv.nav ? " &nbsp;" + esc(a.kv.nav) : ""}</p>`
    : `<p class="eyebrow">${esc(s.label)}</p>`;
  // a lede is a paragraph marked {.lede} directly after the heading
  let blocks = s.blocks;
  let lede = "";
  if (blocks[0] && blocks[0].k === "p" && blocks[0].a && blocks[0].a.cls.includes("lede")) {
    lede = `<p class="lede">${ctx.inline(blocks[0].text)}</p>`;
    blocks = blocks.slice(1);
  }
  // A --- line splits the section into parts; within a part, a paragraph that is only "|"
  // splits it into columns. So: columns, then --- to go back to full width.
  const parts = [[]];
  for (const b of blocks) {
    if (b.k === "hr") parts.push([]);
    else parts[parts.length - 1].push(b);
  }
  const opt = s.isSources ? { listClass: "srcs" } : {};
  let body = "";
  for (const part of parts) {
    const cols = [[]];
    for (const b of part) {
      if (b.k === "p" && b.text.trim() === "|") cols.push([]);
      else cols[cols.length - 1].push(b);
    }
    if (cols.length > 1) {
      const ratio = String(a.kv.cols || "").split(/\s+/).filter((x) => /^\d*\.?\d+$/.test(x));
      const tpl = ratio.length === cols.length ? ratio.map((r) => `minmax(0,${r}fr)`).join(" ") : `repeat(${cols.length},minmax(0,1fr))`;
      body += `<div class="cols${a.kv.colstyle ? " cols-" + esc(cleanClass(a.kv.colstyle)) : ""}" style="grid-template-columns:${tpl}">` +
        cols.map((c) => `<div class="col">${renderBlocks(c, ctx, opt)}</div>`).join("") + `</div>`;
    } else {
      body += renderBlocks(part, ctx, opt);
    }
  }
  return `<section class="${esc(cls.join(" "))}" id="${esc(s.id)}"><div class="wrap">` +
    `<div class="sechead">${eyebrow}<h2>${ctx.inline(s.h.text)}</h2>${lede}</div>` +
    `<div class="secbody">${body}</div></div></section>`;
}
