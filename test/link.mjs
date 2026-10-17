#!/usr/bin/env node
/* link.mjs — a link carries only what its page shows (linkSource, lib/page.js), and a hosted
 * viewer with no keys is refused. No browser needed.
 *  - every example and widget page renders the same from the trimmed source as from the full one
 *  - front matter the page does not show, and the insides of html/style/demo fences, are not in
 *    the decoded link
 *  - a raw fence nested where the trimmer cannot reach stops the link being made
 *  - buildViewer refuses an empty key list unless told { open: true }
 *
 *   node test/link.mjs
 */
import { readFileSync, readdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { renderPage, linkSource } from "../lib/page.js";
import { decodeFragment } from "../lib/codec.js";
import { makeLink, buildViewer } from "../build.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let fails = 0;
const check = (ok, what) => { console.log(`${ok ? "ok  " : "FAIL"}  ${what}`); if (!ok) fails++; };
const decoded = async (src) => (await decodeFragment(makeLink(src, "").fragment, [])).text;

// 1. the page a link shows is unchanged by trimming
const pages = [...readdirSync(join(root, "examples")).filter((f) => f.endsWith(".md")).map((f) => join(root, "examples", f)),
  ...readdirSync(join(root, "test/widgets")).filter((f) => f.endsWith(".md")).map((f) => join(root, "test/widgets", f))];
for (const p of pages) {
  const src = readFileSync(p, "utf8");
  check(renderPage(linkSource(src).src, { mode: "link" }).html === renderPage(src, { mode: "link" }).html, `same page from the trimmed source: ${p.slice(root.length + 1)}`);
}

// 2. what the page does not show stays out of the link
const secret = `---
title: Draft title
internal: floor is 2.1M, do not disclose
title: Settlement options
dek: What happens next
a line of notes with no key
---

Visible text.

\`\`\`html
<p>reserve: 3.4M</p>
\`\`\`

\`\`\`demo {title="Fee estimate" hint="partner rate 950"}
<script>/* walk-away 1.8M */</script>
\`\`\`

\`\`\`style
/* bottom line 2.2M */
\`\`\`
`;
const { left } = linkSource(secret);
const text = await decoded(secret);
for (const s of ["2.1M", "3.4M", "950", "1.8M", "2.2M", "Draft title", "notes with no key", "internal"]) check(!text.includes(s), `not in the link: ${s}`);
for (const s of ["Settlement options", "What happens next", "Visible text.", 'title="Fee estimate"']) check(text.includes(s), `still in the link: ${s}`);
check(renderPage(text, { mode: "link" }).html === renderPage(secret, { mode: "link" }).html, "the trimmed page looks the same");
check(left.length === 6, `the author is told what was kept out (${left.length}: ${left.join("; ")})`);

// 3. a raw fence the trimmer cannot reach stops the link
const nested = "---\ntitle: T\n---\n\n````callout\nSee below.\n\n```html\n<p>reserve: 3.4M</p>\n```\n````\n";
let threw = "";
try { makeLink(nested, ""); } catch (e) { threw = e.message; }
check(/inside another widget/.test(threw), "a raw fence inside a callout stops the link");

// 4. a viewer with no keys is refused unless asked for
const dir = mkdtempSync(join(tmpdir(), "explainer-kit-test-"));
let refused = false;
try { buildViewer(join(dir, "index.html"), { keys: [], shortener: "" }); } catch (e) { refused = true; }
check(refused, "a viewer with no keys is refused");
check(buildViewer(join(dir, "index.html"), { keys: [], shortener: "", open: true }).keys === 0, "…unless built with open: true");

console.log(fails ? `\n${fails} failed` : "\nall passed");
process.exit(fails ? 1 : 0);
