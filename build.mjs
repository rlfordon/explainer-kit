#!/usr/bin/env node
/* build.mjs — explainer source (.md) → a standalone HTML file, and/or a link.
 *
 *   node build.mjs page.md                 → page.html beside it (review overlay injected)
 *   node build.mjs page.md -o out.html     → choose the output
 *   node build.mjs page.md --no-review     → skip scripts/assemble.mjs (no overlay)
 *   node build.mjs page.md --chat          → also inject the chat dock (via assemble.mjs)
 *   node build.mjs page.md --link [--viewer https://you.github.io/explainer/]
 *                                        → print a local link, and a share link via kit.json "viewer" or --viewer
 *   node build.mjs page.md --check         → lint only: warnings and link size, writes nothing
 *   node build.mjs --viewer-only           → rebuild viewer/index.html (and the kit.json "viewerCopy")
 *   node build.mjs --keygen --name "Name"  → make a signing key (see lib/keys.mjs); links are then signed
 *   node build.mjs page.md --short [--expires 90d|12h|2w|never]
 *                                        → also store an encrypted copy on the link service (kit.json
 *                                          "shortener") and print a short link (lib/short.js)
 *   node build.mjs --short-list            → the short links made on this computer
 *   node build.mjs --short-delete <link|id> → withdraw a short link
 *
 * The file target trusts its author: `html`, `style` and `demo` fences pass through. The link
 * target trusts no one: the viewer renders only the widget set (see lib/page.js).
 * Paths in the usage lines are relative to this folder (node build.mjs …).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, copyFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { deflateRawSync } from "node:zlib";
import { renderPage } from "./lib/page.js";
import { themeCss, fontLink } from "./lib/theme.js";
import { RUNTIME, STATIC, WIDGETS } from "./lib/widgets.js";
import { bundle, modRef } from "./lib/bundle.mjs";
import { encodeFragment } from "./lib/codec.js";
import { esc } from "./lib/md.js";
import { KEY_FILE, loadSigner, newKey, saveSecret, publicKeys } from "./lib/keys.mjs";
import { createShort, deleteShort, parseExpiry, idOf, loadRecord, saveRecord, LINKS_FILE } from "./lib/shortlinks.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const VENDOR = join(HERE, "vendor/html-explainer"); // review overlay + chat dock, from html-explainer (MIT)
const read = (p) => readFileSync(join(HERE, p), "utf8");
const n = (x) => x.toLocaleString("en-US");

// kit.json: { "viewer": hosted viewer URL for share links, "viewerCopy": where --viewer-only
// also writes the viewer (e.g. a website's public folder), "keys": public signing keys the
// viewer trusts (added by --keygen), "shortener": the short-link service's address (worker/) }
const KIT = join(HERE, "kit.json");
export const loadKit = () => (existsSync(KIT) ? JSON.parse(readFileSync(KIT, "utf8")) : {});

export function widgetCss(names) {
  let css = read("css/base.css") + "\n" + read("widgets/css/static.css") + "\n";
  for (const w of names) if (!STATIC.includes(w) && existsSync(join(HERE, `widgets/css/${w}.css`))) css += read(`widgets/css/${w}.css`) + "\n";
  return css;
}

// NOTICE.txt (the MIT notices for html-explainer and Tiny Little Office, whose code the page
// and viewer carry) rides along in every built page as a comment
const notice = () => `<!--\n${read("NOTICE.txt").replace(/--/g, "- -").trim()}\n-->\n`;

function minCss(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s*\n\s*/g, "\n").replace(/\n+/g, "\n").trim();
}

/* the file target's script: only the runtimes this page uses, plus a boot loop */
function fileScript(used) {
  const names = used.filter((w) => RUNTIME.includes(w));
  const runs = names.map((w) => join(HERE, `widgets/run/${w}.js`));
  if (!runs.length) return "";
  const tail = `const H={${names.map((w, i) => `${w}:${modRef(runs, runs[i])}.${w}`).join(",")}};\n` +
    `document.querySelectorAll("[data-w]").forEach(function(el){var f=H[el.dataset.w];if(f){try{f(el)}catch(e){console.error(el.dataset.w,e)}}});`;
  return bundle(runs, tail);
}

export function buildFile(src, { review = true, chat = false, out } = {}) {
  const page = renderPage(src, { mode: "file" });
  const font = fontLink(page.head);
  const css = minCss(widgetCss(page.used)) + "\n" + themeCss(page.head) + (page.styles.length ? "\n/* page styles */\n" + page.styles.join("\n") : "");
  const script = fileScript(page.used);
  const lang = /^[a-z]{2}(-[A-Za-z]{2})?$/.test(page.head.lang || "") ? page.head.lang : "en";
  const html = `<!DOCTYPE html>
${notice()}<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}</title>
${page.description ? `<meta name="description" content="${esc(page.description)}">\n` : ""}<meta name="generator" content="html-explainer/explainer build.mjs">
${font ? `<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="${esc(font)}" rel="stylesheet">\n` : ""}<style>
${css}
</style>
</head>
<body${review ? " data-review-toggle" : ""}>
${page.html}${script ? `<script>\n${script}\n</script>\n` : ""}</body>
</html>
`;
  if (out) {
    writeFileSync(out, html);
    if (review || chat) {
      const args = [join(VENDOR, "assemble.mjs"), out, "-o", out];
      if (chat) args.push("--chat");
      execFileSync(process.execPath, args, { stdio: "pipe" });
    }
  }
  return { page, html };
}

/* the short-link service's origin, or "" (an https address only) */
export function serviceOrigin(s) {
  try { const u = new URL(s); return u.protocol === "https:" ? u.origin : ""; } catch (e) { return ""; }
}

/* The viewer: one HTML file, every widget, a CSP that allows only its own script. With keys,
 * it opens only links signed by one of them; they sit in a JSON block, which never runs. With
 * a short-link service, the CSP lets it fetch from that one address, and nowhere else. */
export function buildViewer(out = join(HERE, "viewer/index.html"), { keys = loadKit().keys, shortener = loadKit().shortener } = {}) {
  const trusted = JSON.stringify(publicKeys(keys)).replace(/</g, "\\u003c");
  const service = serviceOrigin(shortener);
  const script = bundle([join(HERE, "viewer/boot.js")]);
  const hash = createHash("sha256").update(script, "utf8").digest("base64");
  // the themes' fonts are served from the viewer's own folder (fonts/), so font-src 'self'
  const css = minCss(read("fonts/fonts.css") + widgetCss(Object.keys(WIDGETS)) + read("viewer/viewer.css"));
  const csp = `default-src 'none'; script-src 'sha256-${hash}'; style-src 'unsafe-inline'; img-src data:; font-src 'self'; connect-src ${service || "'none'"}; base-uri 'none'; form-action 'none'`;
  const html = `<!DOCTYPE html>
${notice()}<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<meta name="referrer" content="no-referrer">
<meta name="robots" content="noindex">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Explainer</title>
<style>
${css}
</style>
<style id="x-theme"></style>
</head>
<body>
<div id="x-root"></div>
<script type="application/json" id="x-keys">${trusted}</script>
<script type="application/json" id="x-short">${JSON.stringify(service)}</script>
<script>${script}</script>
</body>
</html>
`;
  mkdirSync(join(dirname(out), "fonts"), { recursive: true });
  writeFileSync(out, html);
  for (const f of readdirSync(join(HERE, "fonts"))) if (!f.endsWith(".css")) copyFileSync(join(HERE, "fonts", f), join(dirname(out), "fonts", f));
  return { out, bytes: Buffer.byteLength(html), keys: JSON.parse(trusted).length };
}

/* signer: from loadSigner() (lib/keys.mjs); without one the link is unsigned */
export function makeLink(src, viewer, signer) {
  const frag = encodeFragment(src, (b) => deflateRawSync(b, { level: 9, memLevel: 9 }), signer);
  return { url: viewer + frag, fragment: frag };
}

export function tierOf(len) {
  return len <= 2900 ? "QR code" : len <= 8000 ? "chat-friendly" : len <= 16384 ? "long (fine in email; too long for SMS)" : len <= 100000 ? "very long (needs a short link)" : "too big";
}

/* ---------- CLI ----------
 * After a request to the link service, it ends with `break cli` rather than process.exit():
 * on Windows, Node can crash exiting while that connection is still closing. */
cli: if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const flag = (f) => args.includes(f);
  const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : undefined; };
  const input = args.find((a, i) => !a.startsWith("--") && !["-o", "--viewer", "--name", "--expires", "--short-delete"].includes(args[i - 1]) && a !== "-o");
  const kit = loadKit();

  if (flag("--keygen")) {
    const name = opt("--name");
    if (!name) { console.error('usage: node build.mjs --keygen --name "Your name"   (the name readers see under a signed page)'); process.exit(1); }
    const { secret, pub } = newKey(name);
    try { saveSecret(secret); } catch (e) { console.error(e.message); process.exit(1); }
    kit.keys = [...(kit.keys || []), pub];
    writeFileSync(KIT, JSON.stringify(kit, null, 2) + "\n");
    console.log(`signing key ${pub.id} for "${name}" → ${KEY_FILE}\n  (private: keep it, back it up somewhere safe, never commit it)`);
    console.log("public key added to kit.json. Next: node build.mjs --viewer-only, then deploy the viewer.");
    console.log("Until it is deployed, the hosted viewer keeps its old key list (with none, it opens any link, unchecked).");
    process.exit(0);
  }

  if (flag("--viewer-only")) {
    const v = buildViewer(opt("-o") ? resolve(opt("-o")) : undefined);
    console.log(`viewer → ${v.out} (${n(v.bytes)} bytes)`);
    if (!opt("-o") && kit.viewerCopy) {
      const c = buildViewer(resolve(HERE, kit.viewerCopy));
      console.log(`viewer → ${c.out} (copy for ${kit.viewer || "the hosted viewer"}; commit and deploy it there)`);
    }
    process.exit(0);
  }
  if (flag("--short-list")) {
    const list = loadRecord();
    if (!list.length) console.log(`no short links recorded in ${LINKS_FILE}`);
    const day = (t) => (t ? new Date(t * 1000).toISOString().slice(0, 10) : "never");
    for (const r of list) {
      const state = r.deleted ? `withdrawn ${day(r.deleted)}` : r.expires && r.expires * 1000 < Date.now() ? `expired ${day(r.expires)}` : `expires ${day(r.expires)}`;
      console.log(`${r.id}  made ${day(r.created)}  ${state}  ${r.title}\n          ${r.url}`);
    }
    process.exit(0);
  }
  if (flag("--short-delete")) {
    const service = serviceOrigin(kit.shortener), signer = loadSigner();
    if (!service || !signer) { console.error('withdrawing a short link needs kit.json "shortener" and the signing key'); process.exit(1); }
    let id;
    try { id = idOf(opt("--short-delete") || ""); } catch (e) { console.error(e.message); process.exit(1); }
    let was;
    try { was = await deleteShort(id, { service, signer }); } catch (e) { console.error(e.message); process.exitCode = 1; break cli; }
    const list = loadRecord(), r = list.find((x) => x.id === id);
    if (r && !r.deleted) { r.deleted = Math.floor(Date.now() / 1000); saveRecord(list); }
    console.log(was ? `withdrawn: ${id} stops opening within a minute or so, as Cloudflare's copies catch up` : `${id} was not on the link service (already expired or withdrawn)`);
    break cli;
  }
  if (!input) {
    console.error('usage: node build.mjs page.md [-o out.html] [--no-review] [--chat] [--link [--viewer URL]] [--short [--expires 90d]] | --short-list | --short-delete <link> | --viewer-only | --keygen --name "Name"');
    process.exit(1);
  }
  const src = readFileSync(input, "utf8");
  const trusted = publicKeys(kit.keys);
  const signer = loadSigner();
  let warnings;
  if (flag("--check")) {
    // lint: render both targets, write nothing
    const file = renderPage(src, { mode: "file" }), link = renderPage(src, { mode: "link" });
    const { fragment } = makeLink(src, "", signer);
    console.log(`${input}: widgets ${file.used.join(", ") || "none"}; link ${n(fragment.length)} characters — ${tierOf(fragment.length)}`);
    const all = [...new Set([...file.warnings, ...link.warnings])];
    for (const w of all) console.log("  • " + w);
    if (!all.length) console.log("  no warnings");
    process.exit(file.warnings.length ? 1 : 0);
  }
  if (!(flag("--link") || flag("--short")) || flag("--file")) {
    const out = resolve(opt("-o") || input.replace(/\.(md|txt)$/i, "") + ".html");
    const { page, html } = buildFile(src, { review: !flag("--no-review"), chat: flag("--chat"), out });
    warnings = page.warnings;
    const size = Buffer.byteLength(readFileSync(out));
    console.log(`file → ${out} (${n(size)} bytes; widgets: ${page.used.join(", ") || "none"})`);
    void html;
  }
  if (flag("--link") || flag("--short")) {
    // a viewer with keys refuses unsigned links and links from keys it does not hold
    if (trusted.length && !signer) {
      console.error(`no signing key at ${KEY_FILE}, and the viewer opens only signed links.\n` +
        "Restore your key there (or set EXPLAINER_KIT_KEY to its path), or make one with --keygen.");
      process.exit(1);
    }
    if (signer && !trusted.some((k) => k.id === signer.id)) {
      console.error(`the signing key ${signer.id} is not in kit.json "keys", so the viewer would refuse its links. Add its public half there.`);
      process.exit(1);
    }
    const v = buildViewer();
    const page = renderPage(src, { mode: "link" });
    warnings = page.warnings;
    const { url, fragment } = makeLink(src, pathToFileURL(v.out).href, signer);
    console.log(`link fragment: ${n(fragment.length)} characters — ${tierOf(fragment.length)}${signer ? `; signed by ${signer.name} (${signer.id})` : "; unsigned"}`);
    console.log(url); // the local viewer: works on this computer only
    const share = opt("--viewer") || kit.viewer;
    if (share) console.log(`\nto share (viewer at ${share}):\n${makeLink(src, share, signer).url}`);
    if (flag("--short")) {
      const service = serviceOrigin(kit.shortener);
      if (!service) { console.error('\n--short needs kit.json "shortener": the link service\'s https address (see worker/README.md)'); process.exit(1); }
      if (!share) { console.error('\n--short needs kit.json "viewer" (or --viewer): the hosted viewer\'s address'); process.exit(1); }
      let expiresIn;
      try { expiresIn = parseExpiry(opt("--expires")); } catch (e) { console.error(e.message); process.exit(1); }
      const { fragment: long } = makeLink(src, "", signer);
      let s;
      try { s = await createShort(long, { service, viewer: share, signer, expiresIn }); } catch (e) { console.error("\n" + e.message); process.exitCode = 1; break cli; }
      saveRecord([...loadRecord(), { id: s.id, title: page.title || input, created: Math.floor(Date.now() / 1000), expires: s.expires, url: s.url }]);
      const until = s.expires ? `until ${new Date(s.expires * 1000).toISOString().slice(0, 10)}` : "with no expiry";
      console.log(`\nshort link (${s.url.length} characters; opens ${until}; withdraw with --short-delete ${s.id}):\n${s.url}`);
    }
  }
  if (warnings && warnings.length) {
    console.log(`\n${warnings.length} warning${warnings.length > 1 ? "s" : ""}:`);
    for (const w of [...new Set(warnings)]) console.log("  • " + w);
  }
}
