/* wkit.js — small helpers the widget renderers share. No DOM, no Node. */
import { parse, esc, cleanId, cleanClass, cellOf, quoteParas, splitRow, parseColumn } from "./md.js";

/* A widget's table. Inside a fence the --- separator row is optional: the first line with a
 * "|" is the header and every later one a row. */
export function firstTable(body) {
  const t = parse(body).blocks.find((b) => b.k === "table");
  if (t) return t;
  const lines = String(body).split("\n").filter((l) => l.includes("|") && !/^\s*\|?\s*:?-{3,}/.test(l));
  if (lines.length < 2) return null;
  return { k: "table", cols: splitRow(lines[0]).map(parseColumn), rows: lines.slice(1).map(splitRow) };
}

export function firstList(body) {
  return parse(body).blocks.find((b) => b.k === "list") || null;
}

/* The demo card every interactive widget sits in: a head (title + hint) and a body. */
export function shell(name, b, ctx, inner, { cls = "", title = "", data = "" } = {}) {
  const a = b.a || { id: "", cls: [], kv: {} };
  const t = a.kv.title || title, hint = a.kv.hint;
  const id = a.id ? ` id="${esc(cleanId(a.id))}"` : "";
  const extra = a.cls.map(cleanClass).filter(Boolean).join(" ");
  return `<div class="demo w-${name}${cls ? " " + cls : ""}${extra ? " " + esc(extra) : ""}"${id} data-w="${name}"${data}>` +
    (t ? `<div class="demo-head"><h3>${ctx.inline(t)}</h3>${hint ? `<span class="hint">${ctx.inline(hint)}</span>` : ""}</div>` : "") +
    `<div class="demo-body">${inner}</div></div>`;
}

/* "**Lead** rest" → [lead, rest] (the bold opening of a list item). */
export function lead(text) {
  const m = String(text).match(/^\*\*(.+?)\*\*[\s:.—–-]*([\s\S]*)$/);
  return m ? [m[1], m[2]] : ["", text];
}

export function cells(row, n) {
  const out = [];
  for (let k = 0; k < n; k++) out.push(cellOf(row[k] ?? ""));
  return out;
}

export function topicOf(a, ctx) {
  return (a && a.cls.find((c) => ctx.colors[c])) || "";
}

export { esc, cleanClass, quoteParas };
