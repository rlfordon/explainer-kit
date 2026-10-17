#!/usr/bin/env node
/* live.mjs — check the hosted viewer: a signed link opens, an unsigned one is refused, and
 * (with kit.json "shortener") a short link opens through the live link service.
 *
 *   node test/live.mjs [examples/page.md]
 * Needs the signing key (lib/keys.mjs) and kit.json "viewer". Makes no other request than the
 * viewer page, its fonts and the link service. The short link it makes expires in an hour and
 * is withdrawn at the end; it is not added to your list of short links.
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { makeLink, loadKit, serviceOrigin } from "../build.mjs";
import { loadSigner } from "../lib/keys.mjs";
import { createShort, deleteShort, parseExpiry } from "../lib/shortlinks.mjs";

const src = readFileSync(process.argv[2] || "examples/client-options.md", "utf8");
const kit = loadKit(), viewer = kit.viewer, signer = loadSigner(), service = serviceOrigin(kit.shortener);
if (!viewer || !signer) { console.error("needs kit.json \"viewer\" and a signing key"); process.exit(1); }

const checks = [["signed", makeLink(src, viewer, signer).url, "open"], ["unsigned", makeLink(src, viewer).url, "refuse"]];
let short;
if (service) {
  short = await createShort(makeLink(src, "", signer).fragment, { service, viewer, signer, expiresIn: parseExpiry("1h") });
  checks.push([`short (${short.url.length} characters)`, short.url, "open"]);
}

const browser = await chromium.launch();
const page = await browser.newPage();
const fails = [];
for (const [name, url, want] of checks) {
  await page.goto(url);
  await page.waitForFunction(() => document.title !== "Opening…" && document.querySelector("#x-root main"), null, { timeout: 15000 });
  const r = await page.evaluate(() => ({
    h1: document.querySelector("#x-root h1")?.textContent || "",
    signed: document.querySelector(".x-signed")?.textContent || "",
    refused: document.querySelector(".x-msg .dek")?.textContent || "",
  }));
  console.log(`${name}: ${r.signed || r.refused ? (r.signed ? r.h1 + " — " + r.signed : "refused — " + r.refused) : r.h1}`);
  if (want === "open" && !r.signed) fails.push(`${name} link did not open signed`);
  if (want === "refuse" && !r.refused) fails.push(`${name} link was not refused`);
}
await browser.close();
if (short) await deleteShort(short.id, { service, signer });

console.log(fails.length ? "FAIL\n  • " + fails.join("\n  • ") : `ok — ${viewer} opens signed links${short ? " and short links" : ""} and refuses unsigned ones`);
process.exitCode = fails.length ? 1 : 0;
