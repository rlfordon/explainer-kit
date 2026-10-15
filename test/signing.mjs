#!/usr/bin/env node
/* signing.mjs — a viewer with keys opens only links its keys signed, unaltered.
 * First the codec in Node (signed, unsigned, unknown key, altered payload, borrowed signature,
 * cut-off link, a viewer with no keys), then the built viewer in Chromium, from file://.
 *
 *   node test/signing.mjs
 */
import { chromium } from "playwright";
import { deflateRawSync } from "node:zlib";
import { encodeFragment, decodeFragment, spaced, REFUSED } from "../lib/codec.js";
import { newKey, signerOf } from "../lib/keys.mjs";
import { makeLink } from "../build.mjs";
import { testKit } from "./keyed.mjs";

const deflate = (b) => deflateRawSync(b, { level: 9 });
const fails = [];
const expect = (what, ok) => { if (!ok) fails.push(what); };
async function refused(what, frag, keys, reason) {
  try { await decodeFragment(frag, keys); fails.push(`${what}: opened, but should have been refused`); }
  catch (e) { expect(`${what}: refused with the wrong message ("${e.message}")`, e.message === reason); }
}
// change the payload while keeping the link well formed: rewrite one character past the header,
// flipping its high bit (a last character's low bits can be padding, so changing those proves nothing)
const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~_";
function alter(frag, at) {
  const head = "#/v1/s", rest = frag.slice(head.length).replace(/\./g, "");
  const i = 1 + 8 + 86 + at, c = B64[B64.indexOf(rest[i]) ^ 32];
  return head + spaced(rest.slice(0, i) + c + rest.slice(i + 1));
}

const a = newKey("Author A"), b = newKey("Author B");
const sa = signerOf(a.secret), sb = signerOf(b.secret);
const keys = [a.pub];
const src = "---\ntitle: Signed page\n---\n\n## One\n\n" + "Some text that compresses. ".repeat(40);
const other = "---\ntitle: Another page\n---\n\nDifferent words entirely.";

const good = encodeFragment(src, deflate, sa);
const r = await decodeFragment(good, keys);
expect("signed link: text did not round-trip", r.text === src);
expect("signed link: signer name missing", r.signer === "Author A");
expect("signed link: should start #/v1/s", good.startsWith("#/v1/sz"));
expect("signed link: a period every 200 characters", good.slice(6).split(".").slice(0, -1).every((p) => p.length === 200));
const tiny = encodeFragment("hi", deflate, sa); // raw beats deflate for two bytes
expect("signed raw link did not round-trip", tiny.startsWith("#/v1/sr") && (await decodeFragment(tiny, keys)).text === "hi");
expect("a hyphen in place of ~ must still verify", (await decodeFragment(good.replace(/~/g, "-"), keys)).text === src);

await refused("unsigned link", encodeFragment(src, deflate), keys, REFUSED.unsigned);
await refused("link signed by an unknown key", encodeFragment(src, deflate, sb), keys, REFUSED.unknown);
await refused("altered payload", alter(good, 40), keys, REFUSED.altered);
await refused("altered last character", alter(good, good.replace(/\./g, "").length - 6 - 1 - 8 - 86 - 1), keys, REFUSED.altered);
const theirs = encodeFragment(other, deflate, sa).slice(6).replace(/\./g, "");
const mine = good.slice(6).replace(/\./g, "");
await refused("signature borrowed from another page", "#/v1/s" + spaced(mine.slice(0, 95) + theirs.slice(95)), keys, REFUSED.altered);
await refused("link cut off", good.slice(0, Math.floor(good.length * 0.7)), keys, REFUSED.altered);
await refused("link cut off inside the signature", good.slice(0, 6 + 1 + 8 + 40), keys, REFUSED.altered);
const flagged = "#/v1/s" + spaced("r" + mine.slice(1)); // relabel deflate as raw: signature covers the flag
await refused("flag changed after signing", flagged, keys, REFUSED.altered);

const open = await decodeFragment(encodeFragment(src, deflate), []);
expect("a viewer with no keys opens unsigned links", open.text === src && open.signer === null);
expect("a viewer with no keys opens signed links, unchecked", (await decodeFragment(good, [])).signer === null);

// the built viewer, in a browser, from file:// (Web Crypto must be available there)
const kit = testKit("Test Author");
const browser = await chromium.launch();
async function visit(url) {
  const page = await browser.newPage();
  const requests = [], errors = [];
  page.on("request", (q) => { if (!/^(file|data|blob):/.test(q.url())) requests.push(q.url()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForSelector("#x-root main", { timeout: 5000 });
  const out = await page.evaluate(() => ({
    h1: document.querySelector("#x-root h1")?.textContent || "",
    dek: document.querySelector(".x-msg .dek")?.textContent || "",
    signed: document.querySelector(".x-origin .x-signed")?.textContent || "",
  }));
  await page.close();
  return { ...out, requests, errors };
}
const shown = await visit(makeLink(src, kit.viewer, kit.signer).url);
expect(`viewer: signed link did not render (h1 "${shown.h1}")`, shown.h1 === "Signed page");
expect(`viewer: no "Signed by" line (got "${shown.signed}")`, shown.signed === "Signed by Test Author.");
const bare = await visit(makeLink(src, kit.viewer).url);
expect(`viewer: unsigned link was not refused (h1 "${bare.h1}")`, bare.h1 === "This link could not be opened" && bare.dek === REFUSED.unsigned);
const forged = await visit(kit.viewer + alter(makeLink(src, "", kit.signer).fragment, 10));
expect(`viewer: altered link was not refused (h1 "${forged.h1}")`, forged.h1 === "This link could not be opened" && forged.dek === REFUSED.altered);
const stranger = await visit(makeLink(src, kit.viewer, sb).url);
expect(`viewer: a stranger's signed link was not refused (h1 "${stranger.h1}")`, stranger.dek === REFUSED.unknown);
for (const v of [shown, bare, forged, stranger]) {
  if (v.requests.length) fails.push("viewer: network requests: " + v.requests.join(", "));
  if (v.errors.length) fails.push("viewer: script errors: " + v.errors.join("; "));
}
await browser.close();

console.log(fails.length ? "FAIL\n  • " + fails.join("\n  • ") : "ok — signed links open; unsigned, unknown-key, altered, borrowed-signature and cut-off links are refused");
process.exit(fails.length ? 1 : 0);
