/* expr.js — the formula language widgets use (calc, triage), and the number formats.
 *
 * A link is data anyone can write, so a formula is parsed here, never handed to eval or
 * Function. It can use: numbers (12, 0.5, 1e6), "strings" (for == and != only), the names
 * the widget defines, + - * / % ^ (power), < <= > >= == !=, && || !, a ? b : c, parentheses
 * and the functions in FN. Nothing else exists, there are no loops, and sizes are capped,
 * so a hostile formula can only produce a wrong number.
 *
 *   compile("t + q*40", ["t", "q"])  → { run(scope) → value, names }   (throws on a bad formula)
 *   fmt(value, "money")              → "$0.42"
 *   template("{n | count} requests") → parts for widgets to render (see below)
 * No DOM, no Node.
 */

const MAX_LEN = 600, MAX_TOKENS = 300, MAX_DEPTH = 40;

const clamp = (x, a, b) => Math.min(Math.max(x, a), b);
const FN = {
  min: (...a) => Math.min(...a), max: (...a) => Math.max(...a), abs: Math.abs,
  round: (x, d = 0) => { const k = 10 ** clamp(Math.round(d), 0, 10); return Math.round(x * k) / k; },
  floor: Math.floor, ceil: Math.ceil, sqrt: Math.sqrt, exp: Math.exp, ln: Math.log, log: Math.log,
  log10: Math.log10, pow: Math.pow, sign: Math.sign, clamp,
  sigmoid: (z) => 1 / (1 + Math.exp(-z)),
  logit: (p) => { p = clamp(p, 1e-9, 1 - 1e-9); return Math.log(p / (1 - p)); },
};
const CONST = { pi: Math.PI };

function tokenize(src) {
  const out = [];
  const re = /\s*(?:(\d+\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|"([^"]*)"|'([^']*)'|(\*\*|<=|>=|==|!=|&&|\|\||[-+*/%^<>!?:(),]))/y;
  let i = 0;
  while (i < src.length) {
    if (/^\s*$/.test(src.slice(i))) break;
    re.lastIndex = i;
    const m = re.exec(src);
    if (!m) throw new Error(`unexpected "${src.slice(i).trim().slice(0, 12)}"`);
    i = re.lastIndex;
    if (m[1] !== undefined) out.push({ t: "num", v: Number(m[1]) });
    else if (m[2] !== undefined) out.push({ t: "id", v: m[2] });
    else if (m[3] !== undefined || m[4] !== undefined) out.push({ t: "str", v: m[3] ?? m[4] });
    else out.push({ t: "op", v: m[5] === "**" ? "^" : m[5] });
    if (out.length > MAX_TOKENS) throw new Error("formula too long");
  }
  return out;
}

const BIN = { "||": 1, "&&": 2, "==": 3, "!=": 3, "<": 4, "<=": 4, ">": 4, ">=": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6, "^": 8 };

function num(x) { return typeof x === "string" ? NaN : Number(x); }

/* Parse to a tree of closures. known: the names the formula may use. */
export function compile(src, known = []) {
  src = String(src ?? "");
  if (src.length > MAX_LEN) throw new Error("formula too long");
  const toks = tokenize(src);
  const names = new Set();
  const allowed = new Set(known);
  let k = 0;
  const peek = () => toks[k], next = () => toks[k++];
  const isOp = (v) => toks[k] && toks[k].t === "op" && toks[k].v === v;
  const expect = (v) => { if (!isOp(v)) throw new Error(`expected "${v}"`); k++; };

  function primary(d) {
    if (d > MAX_DEPTH) throw new Error("formula nested too deeply");
    const t = next();
    if (!t) throw new Error("formula ends too soon");
    if (t.t === "num") { const v = t.v; return () => v; }
    if (t.t === "str") { const v = t.v; return () => v; }
    if (t.t === "op" && t.v === "(") { const e = ternary(d + 1); expect(")"); return e; }
    if (t.t === "op" && (t.v === "-" || t.v === "+" || t.v === "!")) {
      const e = binary(d + 1, BIN["^"]); // so -2^2 is -(2^2)
      return t.v === "-" ? (s) => -num(e(s)) : t.v === "+" ? (s) => num(e(s)) : (s) => !e(s);
    }
    if (t.t === "id") {
      if (isOp("(")) {
        const f = Object.prototype.hasOwnProperty.call(FN, t.v) ? FN[t.v] : null;
        if (!f) throw new Error(`unknown function ${t.v}()`);
        k++;
        const args = [];
        if (!isOp(")")) { do { args.push(ternary(d + 1)); } while (isOp(",") && ++k); }
        expect(")");
        if (args.length > 20) throw new Error("too many arguments");
        return (s) => f(...args.map((a) => num(a(s))));
      }
      if (Object.prototype.hasOwnProperty.call(CONST, t.v) && !allowed.has(t.v)) { const v = CONST[t.v]; return () => v; }
      if (t.v === "true" || t.v === "false") { const v = t.v === "true"; return () => v; }
      if (!allowed.has(t.v)) throw new Error(`unknown name "${t.v}"`);
      names.add(t.v);
      const name = t.v;
      return (s) => (s.has(name) ? s.get(name) : NaN);
    }
    throw new Error(`unexpected "${t.v}"`);
  }
  function unary(d) { return primary(d); }
  function binary(d, minPrec) {
    let left = unary(d);
    for (;;) {
      const t = peek();
      if (!t || t.t !== "op" || !(t.v in BIN) || BIN[t.v] < minPrec) return left;
      k++;
      const op = t.v, prec = BIN[op];
      const right = binary(d + 1, op === "^" ? prec : prec + 1);
      left = combine(op, left, right);
    }
  }
  function ternary(d) {
    if (d > MAX_DEPTH) throw new Error("formula nested too deeply");
    const c = binary(d, 1);
    if (!isOp("?")) return c;
    k++;
    const a = ternary(d + 1);
    expect(":");
    const b = ternary(d + 1);
    return (s) => (c(s) ? a(s) : b(s));
  }
  const tree = ternary(0);
  if (k < toks.length) throw new Error(`unexpected "${toks[k].v}"`);
  return {
    names,
    /* scope: a Map of name → value (a Map, so no name can reach Object.prototype) */
    run(scope) { const v = tree(scope instanceof Map ? scope : new Map(Object.entries(scope || {}))); return v; },
  };
}

function combine(op, l, r) {
  switch (op) {
    case "+": return (s) => num(l(s)) + num(r(s));
    case "-": return (s) => num(l(s)) - num(r(s));
    case "*": return (s) => num(l(s)) * num(r(s));
    case "/": return (s) => num(l(s)) / num(r(s));
    case "%": return (s) => num(l(s)) % num(r(s));
    case "^": return (s) => num(l(s)) ** num(r(s));
    case "<": return (s) => num(l(s)) < num(r(s));
    case "<=": return (s) => num(l(s)) <= num(r(s));
    case ">": return (s) => num(l(s)) > num(r(s));
    case ">=": return (s) => num(l(s)) >= num(r(s));
    case "==": return (s) => { const a = l(s), b = r(s); return typeof a === "string" || typeof b === "string" ? String(a) === String(b) : num(a) === num(b); };
    case "!=": return (s) => { const a = l(s), b = r(s); return typeof a === "string" || typeof b === "string" ? String(a) !== String(b) : num(a) !== num(b); };
    case "&&": return (s) => Boolean(l(s)) && Boolean(r(s));
    case "||": return (s) => Boolean(l(s)) || Boolean(r(s));
  }
  throw new Error(`unknown operator ${op}`);
}

/* ---------- formats ---------- */

export const FORMATS = ["int", "count", "money", "percent", "pct1", "duration", "dec0", "dec1", "dec2", "dec3", "plain"];

const intl = (n) => Math.round(n).toLocaleString("en-US");

export function fmt(v, f) {
  if (typeof v === "boolean") return v ? "yes" : "no";
  if (typeof v === "string") return v;
  if (!Number.isFinite(v)) return "n/a";
  switch (f) {
    case "int": return intl(v);
    case "count":
      if (Math.abs(v) >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, "") + " billion";
      if (Math.abs(v) >= 1e6) return (v / 1e6).toFixed(Math.abs(v) >= 1e7 ? 0 : 1).replace(/\.0$/, "") + " million";
      return intl(v);
    case "money": return (v < 0 ? "−" : "") + "$" + (Math.abs(v) < 1 ? Math.abs(v).toFixed(2) : intl(Math.abs(v)));
    case "percent": return Math.round(v * 100) + "%";
    case "pct1": return (v * 100).toFixed(1) + "%";
    case "duration": {
      const s = v;
      return s < 90 ? Math.max(1, Math.round(s)) + " sec" : s < 5400 ? Math.round(s / 60) + " min" : s < 172800 ? (s / 3600).toFixed(1) + " hours" : (s / 86400).toFixed(1) + " days";
    }
    case "dec0": case "dec1": case "dec2": case "dec3": return v.toFixed(+f[3]);
    default:
      if (Number.isInteger(v)) return intl(v);
      return String(+v.toPrecision(Math.abs(v) >= 1 ? 4 : 3));
  }
}

/* ---------- templates: text with {formula} or {formula | format} ---------- */

/* Split a template into text and formula parts. A "{" right after "]" belongs to an inline
 * span ([label]{.class}), not a formula. → [{ text } | { x: formula, f: format }] */
export function template(src) {
  const parts = [];
  let i = 0, text = "";
  src = String(src ?? "");
  while (i < src.length) {
    const c = src[i];
    if (c === "{" && src[i - 1] !== "]" && src[i - 1] !== "\\") {
      const j = src.indexOf("}", i + 1);
      if (j > i) {
        const body = src.slice(i + 1, j);
        const m = body.match(/^(.*?)(?:\s\|\s*([a-z0-9]+))?\s*$/);
        if (text) parts.push({ text }), text = "";
        parts.push({ x: m[1].trim(), f: m[2] && FORMATS.includes(m[2]) ? m[2] : "" });
        i = j + 1;
        continue;
      }
    }
    text += c;
    i++;
  }
  if (text) parts.push({ text });
  return parts;
}
