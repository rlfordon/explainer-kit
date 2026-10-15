/* bundle.mjs — a forty-line bundler for this folder's own modules, so the viewer and the file
 * target ship one inline script with no build tool. It understands exactly the module style
 * used here: `import { a, b } from "./x.js";` and `export function|const|let|class name`.
 * Each module becomes a function scope; no cycles, no default exports, no re-export lists. */
import { readFileSync } from "node:fs";
import { resolve, dirname, relative } from "node:path";

const IMPORT = /^import\s*\{([^}]*)\}\s*from\s*["']([^"']+)["'];?[ \t]*$/gm;
const REEXPORT = /^export\s*\{([^}]*)\};?[ \t]*$/gm;
const EXPORT = /^export\s+(async\s+function|function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;

export function bundle(entries, tail = "") {
  const order = [], seen = new Set();
  const root = dirname(resolve(entries[0]));
  function visit(file) {
    file = resolve(file);
    if (seen.has(file)) return;
    seen.add(file);
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(IMPORT)) visit(resolve(dirname(file), m[2]));
    order.push(file);
  }
  entries.forEach(visit);
  const key = (f) => relative(root, f).replace(/\\/g, "/");
  let out = '(function(){"use strict";\nconst __m={};\n';
  for (const file of order) {
    // LF only: the HTML parser turns CRLF into LF before a CSP hash is checked
    let src = readFileSync(file, "utf8").replace(/\r\n?/g, "\n");
    const names = [];
    src = src.replace(IMPORT, (_, list, from) =>
      `const {${list.replace(/\s+as\s+/g, ": ")}} = __m[${JSON.stringify(key(resolve(dirname(file), from)))}];`);
    src = src.replace(REEXPORT, (_, list) => { names.push(...list.split(",").map((s) => s.trim()).filter(Boolean)); return ""; });
    src = src.replace(EXPORT, (_, kw, name) => { names.push(name); return `${kw} ${name}`; });
    out += `__m[${JSON.stringify(key(file))}]=(function(){\n${src}\nreturn {${names.join(",")}};\n})();\n`;
  }
  return out + tail + "\n})();";
}

/* the exports of one bundled module, by path relative to the first entry's folder */
export function modRef(entries, file) {
  const root = dirname(resolve(entries[0]));
  return `__m[${JSON.stringify(relative(root, resolve(file)).replace(/\\/g, "/"))}]`;
}
