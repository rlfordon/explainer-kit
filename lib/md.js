/* md.js — the explainer source format: a small Markdown dialect, after Tiny Little Office's TLO.
 *
 * Runs unchanged in Node (build, lint) and in the browser (the link viewer), so it touches
 * no DOM and no Node API. Everything that reaches HTML goes through esc(), safeUrl() or
 * cleanClass(); the viewer depends on that, because a link is text anyone can write.
 *
 * A source is: optional front matter (--- key: value ---), then blocks:
 *   # h1 … ###### h6      ¶ paragraph      - / 1. lists (task items: - [ ] / - [x])
 *   > quote               --- break        | tables | with a --- | --- separator row
 *   ```lang {attrs}       a fence: a widget when lang names one, else code
 * Any block may end with {#id .class key=value key="quoted value"}, on its last line or
 * on a line of its own right after it.
 */

/* ---------- escaping and validation ---------- */

export function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function cleanClass(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9_-]/g, "");
}

export function cleanId(s) {
  return String(s).replace(/[^A-Za-z0-9_-]/g, "");
}

export function slug(s) {
  return String(s).toLowerCase().replace(/<[^>]*>/g, "").replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 48) || "section";
}

/* Only these schemes ever become an href; anything else renders as plain text. */
export function safeUrl(u) {
  u = String(u).trim();
  if (/^(https?:\/\/|mailto:|tel:)/i.test(u) && !/[\s<>"']/.test(u)) return u;
  if (/^#[A-Za-z0-9_-]*$/.test(u)) return u;
  return null;
}

export function hexColor(s) {
  s = String(s || "").trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s) ? s.toLowerCase() : null;
}

/* ---------- attributes: {#id .class key=value key="quoted"} ---------- */

export function parseAttrs(s) {
  const a = { id: "", cls: [], kv: {} };
  if (!s) return a;
  const re = /#([\w-]+)|\.([\w-]+)|([\w-]+)=(?:"([^"]*)"|'([^']*)'|([^\s"']+))/g;
  let m;
  while ((m = re.exec(s))) {
    if (m[1]) a.id = m[1];
    else if (m[2]) a.cls.push(m[2].toLowerCase());
    else a.kv[m[3].toLowerCase()] = m[4] ?? m[5] ?? m[6] ?? "";
  }
  return a;
}

const ATTR_TAIL = /(^|\s)\{\s*((?:[#.][\w-]+|[\w-]+=(?:"[^"]*"|'[^']*'|[^\s"'}]+))(?:\s+(?:[#.][\w-]+|[\w-]+=(?:"[^"]*"|'[^']*'|[^\s"'}]+)))*)\s*\}\s*$/;

/* Split a trailing attribute block off a line. "[FBI]{.fbi}" is an inline span, not block
 * attributes, because block attributes need whitespace (or nothing) before the brace. */
export function splitAttrs(line) {
  const m = String(line).match(ATTR_TAIL);
  if (!m) return [line, null];
  return [line.slice(0, m.index + m[1].length).replace(/\s+$/, ""), parseAttrs(m[2])];
}

export function mergeAttrs(a, b) {
  if (!b) return a || parseAttrs("");
  a = a || parseAttrs("");
  return { id: b.id || a.id, cls: [...a.cls, ...b.cls], kv: { ...a.kv, ...b.kv } };
}

export function attrHtml(a, extraCls) {
  const cls = [...(extraCls ? [extraCls] : []), ...((a && a.cls) || []).map(cleanClass)].filter(Boolean);
  let s = "";
  if (a && a.id) s += ` id="${esc(cleanId(a.id))}"`;
  if (cls.length) s += ` class="${esc(cls.join(" "))}"`;
  return s;
}

/* ---------- front matter ---------- */

function parseHead(lines) {
  const head = {};
  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z][\w-]*)\s*:\s?(.*)$/);
    if (m) head[m[1].toLowerCase()] = m[2].trim();
  }
  return head;
}

/* ---------- block parser ---------- */

const RE_FENCE = /^(\s*)(`{3,}|~{3,})\s*([\w-]*)\s*(.*)$/;
const RE_HEAD = /^(#{1,6})\s+(.*)$/;
const RE_HR = /^\s*(-{3,}|\*{3,}|_{3,})\s*$/;
const RE_ITEM = /^(\s*)([-*+]|\d{1,3}[.)])\s+(.*)$/;
const RE_SEP = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;
const RE_ATTR_ONLY = /^\s*\{\s*(?:[#.][\w-]+|[\w-]+=)[^{}]*\}\s*$/;

export function parse(src) {
  const lines = String(src).replace(/\r\n?/g, "\n").split("\n");
  let i = 0;
  let head = {};
  if (/^---\s*$/.test(lines[0] || "")) {
    const end = lines.findIndex((l, k) => k > 0 && /^---\s*$/.test(l));
    if (end > 0) { head = parseHead(lines.slice(1, end)); i = end + 1; }
  }
  const blocks = [];
  const isBlank = (l) => !l || !l.trim();
  const isTableStart = (k) => k + 1 < lines.length && lines[k].includes("|") && RE_SEP.test(lines[k + 1]);

  while (i < lines.length) {
    const line = lines[i];
    if (isBlank(line)) { i++; continue; }

    if (RE_ATTR_ONLY.test(line) && blocks.length) {
      const last = blocks[blocks.length - 1];
      last.a = mergeAttrs(last.a, parseAttrs(line.trim().slice(1, -1)));
      i++; continue;
    }

    let m = line.match(RE_FENCE);
    if (m) {
      const fence = m[2], lang = m[3].toLowerCase();
      const [, a] = splitAttrs(" " + m[4]);
      const body = [];
      i++;
      while (i < lines.length && !(lines[i].trim().startsWith(fence[0].repeat(fence.length)) && lines[i].trim().replace(/[`~]/g, "") === "")) {
        body.push(lines[i]); i++;
      }
      i++; // closing fence
      const ind = m[1].length;
      blocks.push({ k: "fence", lang, body: body.map((l) => l.slice(Math.min(ind, l.length - l.trimStart().length))).join("\n"), a: a || parseAttrs(m[4].replace(/^\{|\}$/g, "")) });
      continue;
    }

    m = line.match(RE_HEAD);
    if (m) {
      const [text, a] = splitAttrs(m[2].trim());
      blocks.push({ k: "h", level: m[1].length, text, a });
      i++; continue;
    }

    if (RE_HR.test(line)) { blocks.push({ k: "hr" }); i++; continue; }

    if (isTableStart(i)) {
      const header = splitRow(lines[i]);
      i += 2;
      const rows = [];
      while (i < lines.length && !isBlank(lines[i]) && lines[i].includes("|") && !RE_ATTR_ONLY.test(lines[i])) {
        rows.push(splitRow(lines[i])); i++;
      }
      blocks.push({ k: "table", cols: header.map(parseColumn), rows });
      continue;
    }

    if (RE_ITEM.test(line)) {
      const start = i;
      i++;
      while (i < lines.length) {
        if (isBlank(lines[i])) {
          // a blank line continues the list if the next content line is an item or indented
          let k = i; while (k < lines.length && isBlank(lines[k])) k++;
          if (k < lines.length && (RE_ITEM.test(lines[k]) || /^\s{2,}\S/.test(lines[k]))) { i = k; continue; }
          break;
        }
        if (RE_ITEM.test(lines[i]) || /^\s+\S/.test(lines[i])) { i++; continue; }
        if (RE_ATTR_ONLY.test(lines[i])) break;
        break;
      }
      blocks.push({ k: "list", items: parseList(lines.slice(start, i)) });
      continue;
    }

    if (/^\s*>/.test(line)) {
      const q = [];
      while (i < lines.length && /^\s*>/.test(lines[i])) { q.push(lines[i].replace(/^\s*>\s?/, "")); i++; }
      const [text, a] = splitAttrs(q.join("\n"));
      blocks.push({ k: "quote", text, a });
      continue;
    }

    // paragraph
    const p = [];
    while (i < lines.length && !isBlank(lines[i]) && !RE_FENCE.test(lines[i]) && !RE_HEAD.test(lines[i]) &&
           !RE_ITEM.test(lines[i]) && !/^\s*>/.test(lines[i]) && !isTableStart(i) && !RE_ATTR_ONLY.test(lines[i]) &&
           !(p.length && RE_HR.test(lines[i]))) {
      p.push(lines[i].trim()); i++;
    }
    const [text, a] = splitAttrs(p.join("\n"));
    blocks.push({ k: "p", text, a });
  }
  return { head, blocks };
}

/* ---------- tables ---------- */

export function splitRow(line) {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const cells = [];
  let cur = "", code = false;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (c === "\\" && s[k + 1] === "|") { cur += "|"; k++; continue; }
    if (c === "`") code = !code;
    if (c === "|" && !code) { cells.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  cells.push(cur.trim());
  return cells;
}

const COL_TYPES = ["option", "long", "check", "date", "number", "money", "percent", "text"];

export function parseColumn(cell) {
  const [text, a] = splitAttrs(cell);
  const m = text.match(/^(.*?):([a-z]+)$/);
  if (m && COL_TYPES.includes(m[2])) return { name: m[1].trim(), type: m[2], a };
  return { name: text.trim(), type: "text", a };
}

/* A cell: text plus optional trailing {attrs}. */
export function cellOf(s) {
  const [text, a] = splitAttrs(s || "");
  return { text, a };
}

/* ---------- lists → trees ---------- */

/* Items keep their first line in `text`; indented lines that follow become `paras`
 * (blank-line separated) or `quote` (lines starting with >). Children nest by indent. */
export function parseList(lines) {
  const root = { children: [], indent: -1 };
  const stack = [root];
  let cur = null, blankBefore = false;
  for (const raw of lines) {
    if (!raw.trim()) { blankBefore = true; continue; }
    const m = raw.match(RE_ITEM);
    const indent = raw.length - raw.trimStart().length;
    if (m) {
      let text = m[3], done = null;
      const t = text.match(/^\[([ xX])\]\s+(.*)$/);
      if (t) { done = t[1] !== " "; text = t[2]; }
      const [txt, a] = splitAttrs(text);
      const node = { indent, ord: /\d/.test(m[2]), done, text: txt, a, paras: [], quote: [], children: [] };
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
      stack[stack.length - 1].children.push(node);
      stack.push(node);
      cur = node; blankBefore = false;
      continue;
    }
    if (!cur) continue;
    // an indented line belongs to the nearest open item indented less than it
    // (so a question's "> why" written under its options goes to the question)
    for (let k = stack.length - 1; k > 0; k--) {
      if (stack[k].indent < indent) { if (stack[k] !== cur) { cur = stack[k]; stack.length = k + 1; } break; }
    }
    const t = raw.trim();
    if (t.startsWith(">")) {
      const q = t.replace(/^>\s?/, "");
      if (!q) cur.quote.push("");
      else if (blankBefore && cur.quote.length) cur.quote.push("", q);
      else cur.quote.push(q);
    } else if (blankBefore || !cur.paras.length && cur.text === "") {
      cur.paras.push(t);
    } else if (cur.paras.length) {
      cur.paras[cur.paras.length - 1] += "\n" + t;
    } else {
      cur.text += "\n" + t;
    }
    blankBefore = false;
  }
  return root.children;
}

/* Paragraph strings from quote lines (blank entries separate paragraphs). */
export function quoteParas(lines) {
  return lines.join("\n").split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
}

/* ---------- inline ---------- */

/* Inline Markdown → HTML. Marks: **bold** *italic* `code` ==highlight== [text](url)
 * [text]{.class} (a span; a topic colour name makes a chip). Everything else is escaped. */
export function inline(src, ctx) {
  src = String(src ?? "");
  let out = "";
  let i = 0;
  const colors = (ctx && ctx.colors) || {};
  while (i < src.length) {
    const c = src[i];
    if (c === "\\" && i + 1 < src.length && /[\\`*_[\]{}()#+\-.!|>~=^]/.test(src[i + 1])) {
      out += esc(src[i + 1]); i += 2; continue;
    }
    if (c === "\n") { out += "\n"; i++; continue; }
    if (c === "`") {
      const j = src.indexOf("`", i + 1);
      if (j > i) { out += "<code>" + esc(src.slice(i + 1, j)) + "</code>"; i = j + 1; continue; }
    }
    if (c === "*" && src[i + 1] === "*") {
      const j = src.indexOf("**", i + 2);
      if (j > i + 2) { out += "<strong>" + inline(src.slice(i + 2, j), ctx) + "</strong>"; i = j + 2; continue; }
    }
    if ((c === "*" || c === "_") && src[i + 1] && src[i + 1] !== " " && src[i + 1] !== c &&
        (c === "*" || i === 0 || /[\s(\["'“‘—–-]/.test(src[i - 1]))) {
      let j = i + 1;
      while (j < src.length) {
        j = src.indexOf(c, j);
        if (j < 0) break;
        if (src[j - 1] !== " " && src[j + 1] !== c && (c === "*" || j + 1 >= src.length || /[\s).,;:!?\]"'”’—–-]/.test(src[j + 1]))) break;
        j++;
      }
      if (j > i + 1) { out += "<em>" + inline(src.slice(i + 1, j), ctx) + "</em>"; i = j + 1; continue; }
    }
    if (c === "=" && src[i + 1] === "=") {
      const j = src.indexOf("==", i + 2);
      if (j > i + 2) { out += "<mark>" + inline(src.slice(i + 2, j), ctx) + "</mark>"; i = j + 2; continue; }
    }
    if (c === "[") {
      let depth = 0, j = i;
      for (; j < src.length; j++) {
        if (src[j] === "\\") { j++; continue; }
        if (src[j] === "[") depth++;
        else if (src[j] === "]" && --depth === 0) break;
      }
      if (j < src.length) {
        const label = src.slice(i + 1, j);
        if (src[j + 1] === "(") {
          const k = src.indexOf(")", j + 2);
          if (k > j) {
            const url = safeUrl(src.slice(j + 2, k));
            const inner = inline(label, ctx);
            if (url && url.startsWith("#")) out += `<a href="${esc(url)}">${inner}</a>`;
            else if (url) out += `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
            else out += inner;
            i = k + 1; continue;
          }
        }
        if (src[j + 1] === "{") {
          const k = src.indexOf("}", j + 2);
          if (k > j) {
            const a = parseAttrs(src.slice(j + 2, k));
            const cls = a.cls.map(cleanClass).filter(Boolean);
            const topic = cls.find((x) => colors[x]);
            const all = topic ? ["chip", "c-" + topic, ...cls.filter((x) => x !== topic)] : cls;
            out += `<span${all.length ? ` class="${esc(all.join(" "))}"` : ""}>${inline(label, ctx)}</span>`;
            i = k + 1; continue;
          }
        }
      }
    }
    out += esc(c); i++;
  }
  return out;
}

/* Plain text of inline Markdown (for titles, aria-labels, nav). */
export function plain(src) {
  return String(src ?? "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\[([^\]]*)\]\{[^}]*\}/g, "$1")
    .replace(/[*_`=]{1,2}/g, "").replace(/\\(.)/g, "$1").trim();
}
