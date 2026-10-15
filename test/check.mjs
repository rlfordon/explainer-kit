#!/usr/bin/env node
/* check.mjs — open built explainers (files or viewer links) in headless Chromium and exercise
 * every widget. Reports script errors, network requests, and anything that did not respond;
 * saves desktop (1280) and phone (390) screenshots.
 *
 *   node test/check.mjs page.html [more.html …] [--link URL] [--shots DIR]
 * Exit code 1 if anything failed (a viewer link must also make zero network requests).
 */
import { chromium } from "playwright";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync } from "node:fs";

const args = process.argv.slice(2);
const shots = args.includes("--shots") ? resolve(args[args.indexOf("--shots") + 1]) : null;
const targets = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--shots") { i++; continue; }
  if (args[i] === "--link") { targets.push(args[++i]); continue; }
  targets.push(/^(file|https?):/.test(args[i]) ? args[i] : pathToFileURL(resolve(args[i])).href);
}
if (shots) mkdirSync(shots, { recursive: true });

const browser = await chromium.launch();
let failed = 0;
for (const [ti, url] of targets.entries()) {
  const isLink = url.includes("#/v");
  const name = isLink ? `link-${ti}` : decodeURIComponent(url.split("/").pop().replace(/\.html.*/, ""));
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [], requests = [], problems = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("request", (r) => { if (!/^(file|data|blob):/.test(r.url())) requests.push(r.url().slice(0, 90)); });
  await page.goto(url);
  await page.waitForTimeout(500);
  const title = await page.title();
  const widgets = await page.$$eval("[data-w]", (els) => els.map((e) => e.dataset.w));
  const refused = isLink ? await page.$eval(".x-msg .dek", (e) => e.textContent).catch(() => null) : null;
  if (refused) problems.push("the viewer refused this link: " + refused);
  if (shots) await page.screenshot({ path: `${shots}/${name}-1280.png`, fullPage: true });

  // timeline: every dot updates the panel
  for (const tl of await page.$$('[data-w="timeline"]')) {
    const dots = await tl.$$(".tl-dot");
    const seen = new Set();
    for (const d of dots) { await d.click(); seen.add(await tl.$eval(".tl-panel h4", (h) => h.textContent)); }
    if (!dots.length) problems.push("timeline: no track drawn");
    else if (seen.size !== dots.length) problems.push(`timeline: ${dots.length} dots but ${seen.size} distinct panels`);
  }
  // stepper: walk every track to the end
  for (const st of await page.$$('[data-w="stepper"]')) {
    const wires = await st.$$(".wire");
    for (let w = 0; w < Math.max(1, wires.length); w++) {
      if (wires[w]) await wires[w].click();
      const n = await st.$$eval(".st-track:not([hidden]) .stage", (s) => s.length);
      const seen = new Set();
      for (let k = 0; k < n; k++) {
        seen.add(await st.$eval(".st-track:not([hidden]) .stage:not([hidden])", (s) => s.textContent.slice(0, 80)));
        await st.$eval('[data-act="next"]', (b) => b.click());
      }
      if (seen.size !== n) problems.push(`stepper: track ${w + 1} showed ${seen.size} of ${n} stages`);
    }
  }
  // router: every button on every axis leaves exactly one verdict showing
  for (const rt of await page.$$('[data-w="router"]')) {
    for (const b of await rt.$$(".seg button")) {
      await b.click();
      const shown = await rt.$$eval(".rt-vs > .verdict", (v) => v.filter((x) => getComputedStyle(x).display !== "none").length);
      if (shown !== 1) problems.push(`router: ${shown} verdicts visible after a click`);
    }
  }
  // tree: take the last answer until an outcome, then start over
  for (const tr of await page.$$('[data-w="tree"]')) {
    for (let k = 0; k < 10; k++) {
      const opts = await tr.$$(".btn-choice");
      if (!opts.length) break;
      await opts[opts.length - 1].click();
    }
    if (!(await tr.$(".tdone"))) problems.push("tree: never reached an outcome");
    else await tr.$eval('[data-act="restart"]', (b) => b.click());
    if (!(await tr.$(".btn-choice"))) problems.push("tree: start over did not return to the first question");
  }
  // quiz: answer every question with option A, page through to the results
  for (const qz of await page.$$('[data-w="quiz"]')) {
    const n = await qz.$$eval(".qz", (q) => q.length);
    for (let k = 0; k < n; k++) {
      await qz.$eval(".qz:not([hidden]) .opt:not([disabled])", (o) => o.click());
      const nx = await qz.$(".qz:not([hidden]) .qz-next button");
      if (nx) await nx.click();
    }
    const done = await qz.$eval(".qz-done", (d) => !d.hidden && d.querySelector(".score").textContent);
    if (!done) problems.push("quiz: results never appeared");
  }
  // checklist: tick everything
  for (const ck of await page.$$('[data-w="checklist"]')) {
    for (const b of await ck.$$('input[type="checkbox"]:not(:checked)')) await b.click();
    const c = await ck.$eval(".ck-count", (e) => e.textContent);
    if (!/^(\d+) of \1 done$/.test(c)) problems.push(`checklist: count reads "${c}"`);
  }
  // anything marked hidden must actually be invisible (a class with display: can override it)
  const leaks = await page.$$eval("[hidden]", (els) => els.filter((e) => getComputedStyle(e).display !== "none").length);
  if (leaks) problems.push(`${leaks} element(s) marked hidden are still displayed`);
  // in-page anchors keep the page (and, in the viewer, the fragment) intact
  const before = await page.evaluate(() => location.href);
  const nav = await page.$(".nav .links a:last-child");
  if (nav) {
    await nav.click();
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => location.href);
    if (!(await page.$("main"))) problems.push("anchor: clicking the nav lost the page");
    if (isLink && after !== before) problems.push("anchor: nav click rewrote the link's fragment");
    const y = await page.evaluate(() => window.scrollY);
    if (y < 50) problems.push("anchor: nav click did not scroll");
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 1) problems.push(`phone: page scrolls sideways by ${overflow}px`);
  if (shots) await page.screenshot({ path: `${shots}/${name}-390.png`, fullPage: true });

  const bad = errors.length || problems.length || (isLink && requests.length);
  if (bad) failed++;
  console.log(`\n== ${name} — "${title}"${bad ? "  ✗" : "  ✓"}`);
  console.log(`   widgets: ${widgets.join(", ") || "none"}`);
  console.log(`   script errors: ${errors.length ? errors.join(" | ") : "none"}`);
  console.log(`   network requests: ${requests.length ? [...new Set(requests)].join(", ") : "none"}`);
  console.log(`   problems: ${problems.length ? problems.join(" | ") : "none"}`);
  await page.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
