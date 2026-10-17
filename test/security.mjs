#!/usr/bin/env node
/* security.mjs — the viewer must render a hostile link as inert text.
 * Builds test/evil.md (script tags, event handlers, javascript: and data: links, raw html and
 * demo fences, attribute and CSS injection) into a link, opens it, hovers and clicks
 * everything, and fails if any of it executed, survived as markup, or reached the network.
 * The link is signed by a throwaway key the test viewer trusts: a signature says who wrote a
 * page, not that it is harmless, so a trusted author's hostile page must still render inert.
 *
 *   node test/security.mjs
 */
import { chromium } from "playwright";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { makeLink } from "../build.mjs";
import { testKit } from "./keyed.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const kit = testKit();
// raw: the build keeps raw fences out of links, but anyone can write a link by hand
const { url } = makeLink(readFileSync(join(here, "evil.md"), "utf8"), kit.viewer, kit.signer, { raw: true });

const browser = await chromium.launch();
const page = await browser.newPage();
let dialogs = 0;
const requests = [];
page.on("dialog", (d) => { dialogs++; d.dismiss(); });
page.on("request", (r) => { if (!/^(file|data|blob):/.test(r.url())) requests.push(r.url()); });
await page.goto(url);
await page.waitForTimeout(600);
for (const el of await page.$$("#x-root a, #x-root span, #x-root button")) {
  try { await el.hover({ timeout: 200 }); await el.click({ timeout: 200, noWaitAfter: true }); } catch (e) { /* hidden or detached */ }
}
await page.waitForTimeout(300);
const r = await page.evaluate(() => ({
  executed: window.__pwned || 0,
  scripts: document.querySelectorAll("#x-root script").length,
  media: document.querySelectorAll("#x-root img, #x-root svg, #x-root iframe, #x-root object").length,
  handlers: [...document.querySelectorAll("#x-root *")].filter((e) => [...e.attributes].some((a) => /^on/i.test(a.name))).length,
  badLinks: [...document.querySelectorAll("#x-root a")].map((a) => a.getAttribute("href")).filter((h) => !/^(https?:\/\/|mailto:|tel:|#)/.test(h)),
  bodyHidden: getComputedStyle(document.body).display === "none",
  // the hostile fences for the data-driven widgets must still render (inertly), not vanish
  missing: [".w-calc", ".w-triage", ".w-catalog", ".bars", ".waffle", ".w-locator", ".w-splits"].filter((s) => !document.querySelector("#x-root " + s)),
  rendered: !!document.querySelector("#x-root main:not(.x-msg)") && !!document.querySelector(".x-origin .x-signed"),
}));
await browser.close();

const fails = [];
if (!r.rendered) fails.push("the page did not render at all");
if (r.executed) fails.push(`injected script ran (marker ${r.executed})`);
if (r.scripts) fails.push(`${r.scripts} <script> element(s) in the page`);
if (r.media) fails.push(`${r.media} img/svg/iframe/object element(s) in the page`);
if (r.handlers) fails.push(`${r.handlers} element(s) carry on* handlers`);
if (r.badLinks.length) fails.push("unsafe hrefs: " + r.badLinks.join(", "));
if (r.bodyHidden) fails.push("CSS injection hid the page");
if (r.missing.length) fails.push("these widgets did not render: " + r.missing.join(", "));
if (dialogs) fails.push(`${dialogs} dialog(s) opened`);
if (requests.length) fails.push("network requests: " + requests.join(", "));
console.log(fails.length ? "FAIL\n  • " + fails.join("\n  • ") : "ok — hostile link rendered inert (no script, handlers, media, unsafe links, CSS escape, dialogs or requests)");
process.exit(fails.length ? 1 : 0);
