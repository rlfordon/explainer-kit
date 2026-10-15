#!/usr/bin/env node
/* live.mjs — check the hosted viewer: a signed link opens, an unsigned one is refused.
 *
 *   node test/live.mjs [examples/page.md]
 * Needs the signing key (lib/keys.mjs) and kit.json "viewer". Makes no other request than
 * the viewer page and its fonts.
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { makeLink, loadKit } from "../build.mjs";
import { loadSigner } from "../lib/keys.mjs";

const src = readFileSync(process.argv[2] || "examples/client-options.md", "utf8");
const viewer = loadKit().viewer, signer = loadSigner();
if (!viewer || !signer) { console.error("needs kit.json \"viewer\" and a signing key"); process.exit(1); }

const browser = await chromium.launch();
const page = await browser.newPage();
const fails = [];
for (const [name, url, want] of [["signed", makeLink(src, viewer, signer).url, "open"], ["unsigned", makeLink(src, viewer).url, "refuse"]]) {
  await page.goto(url);
  await page.waitForSelector("#x-root main", { timeout: 15000 });
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
console.log(fails.length ? "FAIL\n  • " + fails.join("\n  • ") : `ok — ${viewer} opens signed links and refuses unsigned ones`);
process.exit(fails.length ? 1 : 0);
