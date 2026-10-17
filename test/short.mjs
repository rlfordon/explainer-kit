#!/usr/bin/env node
/* short.mjs — short links: encrypted copies on the link service, opened by the viewer.
 * First the encryption and the service (worker/index.js, run here against an in-memory KV):
 * signed uploads only, no overwrites, no replays, deletion and expiry. Then the built viewer
 * in Chromium, with the service answering at a test address: a short link opens signed, a
 * withdrawn one is refused, and nothing is fetched from anywhere else.
 *
 *   node test/short.mjs
 */
import { chromium } from "playwright";
import { deflateRawSync } from "node:zlib";
import { encodeFragment, REFUSED } from "../lib/codec.js";
import { newKey, signerOf } from "../lib/keys.mjs";
import { sealShort, openSealed, openShort, uploadMessage, sha256B64, newShortId, newShortKey, SHORT_REFUSED, MAX_SEALED } from "../lib/short.js";
import { createShort, deleteShort, parseExpiry, idOf } from "../lib/shortlinks.mjs";
import { toB64 } from "../lib/codec.js";
import { handle } from "../worker/index.js";
import { testKit } from "./keyed.mjs";

const fails = [];
const expect = (what, ok) => { if (!ok) fails.push(what); };
async function refused(what, p, reason) {
  try { await p; fails.push(`${what}: succeeded, but should have been refused`); }
  catch (e) { expect(`${what}: refused with the wrong message ("${e.message}")`, !reason || e.message === reason); }
}
const deflate = (b) => deflateRawSync(b, { level: 9 });

/* Workers KV, in memory, with a clock for expiry */
let clock = Math.floor(Date.now() / 1000);
function memoryKV() {
  const m = new Map();
  return {
    m,
    async get(k, type) {
      const e = m.get(k);
      if (!e || (e.exp && e.exp <= clock)) return null;
      return type === "arrayBuffer" ? new Uint8Array(e.v).buffer : typeof e.v === "string" ? e.v : new TextDecoder().decode(e.v);
    },
    async put(k, v, o = {}) { m.set(k, { v: typeof v === "string" ? v : new Uint8Array(v), exp: o.expiration || (o.expirationTtl ? clock + o.expirationTtl : 0) }); },
    async delete(k) { m.delete(k); },
  };
}

const A = newKey("Author A"), B = newKey("Author B");
const sa = signerOf(A.secret), sb = signerOf(B.secret);
const env = { LINKS: memoryKV() };
const SERVICE = "https://links.test";
const VIEWER = "https://rlfordon.github.io/explainer/";
let serviceKeys = [A.pub];
const requests = [];
const fetchFn = async (url, o = {}) => { requests.push(o.method || "GET"); return handle(new Request(url, o), env, { keys: serviceKeys, now: clock }); };

const src = "---\ntitle: Short page\n---\n\n## One\n\n" + "Words that compress well. ".repeat(60);
const long = encodeFragment(src, deflate, sa);

// encryption
const id = newShortId(), key = newShortKey();
expect("id is 8 characters and key 22", id.length === 8 && key.length === 22);
const sealed = await sealShort(long, id, key);
expect("sealed copy did not round-trip", (await openSealed(sealed, id, key)) === long);
expect("sealed copy contains the plain link", !new TextDecoder("latin1").decode(sealed).includes("Short page"));
await refused("opened with the wrong key", openSealed(sealed, id, newShortKey()));
await refused("opened under another id", openSealed(sealed, newShortId(), key));
const flipped = sealed.slice(); flipped[40] ^= 1;
await refused("opened after a byte was changed", openSealed(flipped, id, key));

// a round trip through the service
const made = await createShort(long, { service: SERVICE, viewer: VIEWER, signer: sa, fetchFn });
expect(`short link is about 80 characters (got ${made.url.length})`, made.url.length <= 80);
expect("short link has the shape viewer#/v1/k<id><key>", new RegExp(`^${VIEWER.replace(/[/.]/g, "\\$&")}#/v1/k[A-Za-z0-9~_]{30}$`).test(made.url));
expect("default expiry is 90 days", made.expires === clock + 90 * 86400 || Math.abs(made.expires - (Math.floor(Date.now() / 1000) + 90 * 86400)) < 5);
const hash = made.url.slice(made.url.indexOf("#"));
const got = await openShort(hash, [A.pub], SERVICE, fetchFn);
expect("short link did not open the page", got.text === src && got.signer === "Author A");
expect("a hyphen in place of ~ still opens", (await openShort(hash.replace(/~/g, "-"), [A.pub], SERVICE, fetchFn)).text === src);
expect("idOf reads a short link", idOf(made.url) === made.id && idOf(made.id) === made.id);
expect("the service stored only ciphertext", !new TextDecoder("latin1").decode(env.LINKS.m.get(made.id).v).includes("Words that compress"));

// what the service refuses
async function post(id, body, signer, { expires = 0, time = clock, method = "POST", tamper = false, keys } = {}) {
  let sig = signer.sign(uploadMessage(method, id, expires, time, await sha256B64(body)));
  if (tamper) { sig = Uint8Array.from(sig); sig[5] ^= 1; }
  const headers = { "X-Key": signer.id, "X-Time": String(time), "X-Expires": String(expires), "X-Signature": toB64(sig) };
  return handle(new Request(`${SERVICE}/${id}`, { method, body: method === "POST" ? body : undefined, headers }), env, { keys: keys || serviceKeys, now: clock });
}
const body = await sealShort(long, "abcdefgh", key);
expect("upload signed by an unknown key was stored", (await post("abcdefgh", body, sb)).status === 403);
expect("upload with a bad signature was stored", (await post("abcdefgh", body, sa, { tamper: true })).status === 403);
expect("upload signed 10 minutes ago was stored", (await post("abcdefgh", body, sa, { time: clock - 600 })).status === 403);
expect("upload with an expiry in the past was stored", (await post("abcdefgh", body, sa, { expires: clock - 10 })).status === 400);
const unsignedPost = await handle(new Request(`${SERVICE}/abcdefgh`, { method: "POST", body }), env, { keys: serviceKeys, now: clock });
expect("upload with no signature was stored", unsignedPost.status === 403);
expect("an existing id was overwritten", (await post(made.id, body, sa)).status === 409);
expect("an oversized upload was stored", (await post("bigbigbi", new Uint8Array(MAX_SEALED + 1), sa)).status === 413);
expect("an upload was stored after a refused attempt", !env.LINKS.m.has("abcdefgh") && !env.LINKS.m.has("bigbigbi"));
for (const path of ["/", "/index.html", "/abc", "/gone:" + made.id, "/../kit.json"]) {
  const r = await handle(new Request(SERVICE + path), env, { keys: serviceKeys, now: clock });
  expect(`${path}: should be 404 plain text`, r.status === 404 && r.headers.get("Content-Type").startsWith("text/plain"));
}
const put = await handle(new Request(`${SERVICE}/${made.id}`, { method: "PUT", body }), env, { keys: serviceKeys, now: clock });
expect("PUT is not allowed", put.status === 405);
const g = await handle(new Request(`${SERVICE}/${made.id}`), env, { keys: serviceKeys, now: clock });
expect("GET: octet-stream, no-store, any origin", g.headers.get("Content-Type") === "application/octet-stream" && g.headers.get("Cache-Control") === "no-store" && g.headers.get("Access-Control-Allow-Origin") === "*");
await refused("short link to an unsigned page", createShort(encodeFragment(src, deflate), { service: SERVICE, viewer: VIEWER, signer: sa, fetchFn }));

// a page the service accepted but the viewer does not trust (the service trusts both authors)
serviceKeys = [A.pub, B.pub];
const byB = await createShort(encodeFragment(src, deflate, sb), { service: SERVICE, viewer: VIEWER, signer: sb, fetchFn });
await refused("short link to a page by an author the viewer does not trust", openShort(byB.url.slice(byB.url.indexOf("#")), [A.pub], SERVICE, fetchFn), REFUSED.unknown);
serviceKeys = [A.pub];

// a copy moved to another id, or damaged on the service
env.LINKS.m.set("movedmov", env.LINKS.m.get(made.id));
await refused("copy moved to another id", openShort(`#/v1/kmovedmov${hash.slice(-22)}`, [A.pub], SERVICE, fetchFn), SHORT_REFUSED.damaged);
const kept = env.LINKS.m.get(made.id).v;
env.LINKS.m.get(made.id).v = Uint8Array.from(kept, (b, i) => (i === 50 ? b ^ 1 : b));
await refused("copy changed on the service", openShort(hash, [A.pub], SERVICE, fetchFn), SHORT_REFUSED.damaged);
env.LINKS.m.get(made.id).v = kept;

// withdrawal: gone, and a replayed upload cannot bring it back
const replay = { body: env.LINKS.m.get(made.id).v };
expect("deleteShort should report the link was there", (await deleteShort(made.url, { service: SERVICE, signer: sa, fetchFn })) === true);
await refused("withdrawn link", openShort(hash, [A.pub], SERVICE, fetchFn), SHORT_REFUSED.gone);
expect("a replayed upload brought a withdrawn link back", (await post(made.id, replay.body, sa)).status === 409);
expect("deleting twice should report it was already gone", (await deleteShort(made.id, { service: SERVICE, signer: sa, fetchFn })) === false);
const strangerDelete = await post(byB.id, new Uint8Array(0), sb, { method: "DELETE" });
expect("an unknown key withdrew a link", strangerDelete.status === 403 && env.LINKS.m.has(byB.id));

// expiry
const soon = await createShort(long, { service: SERVICE, viewer: VIEWER, signer: sa, expiresIn: parseExpiry("1h"), fetchFn });
const soonHash = soon.url.slice(soon.url.indexOf("#"));
expect("a link opened before it expired", (await openShort(soonHash, [A.pub], SERVICE, fetchFn)).text === src);
clock += 3601;
await refused("expired link", openShort(soonHash, [A.pub], SERVICE, fetchFn), SHORT_REFUSED.gone);
clock -= 3601;
expect("--expires parses h, d, w and never", parseExpiry("12h") === 43200 && parseExpiry("2w") === 1209600 && parseExpiry("never") === 0);
await refused("--expires 0d", (async () => parseExpiry("0d"))());
await refused("viewer with no link service", openShort(soonHash, [A.pub], "", fetchFn), SHORT_REFUSED.noservice);
await refused("link service unreachable", openShort(soonHash, [A.pub], SERVICE, async () => { throw new TypeError("network"); }), SHORT_REFUSED.offline);

// the built viewer, in Chromium, with the service answering at SERVICE
const kit = testKit("Test Author", { shortener: SERVICE });
const plain = testKit("Test Author");
serviceKeys = [kit.pub];
const viewerLink = await createShort(encodeFragment(src, deflate, kit.signer), { service: SERVICE, viewer: kit.viewer, signer: kit.signer, fetchFn });
const browser = await chromium.launch();
async function visit(url) {
  const page = await browser.newPage();
  const outside = [], fetched = [], errors = [];
  await page.route(`${SERVICE}/**`, async (route) => {
    const q = route.request();
    fetched.push(q.url());
    const r = await handle(new Request(q.url(), { method: q.method(), headers: q.headers() }), env, { keys: serviceKeys, now: clock });
    await route.fulfill({ status: r.status, headers: Object.fromEntries(r.headers), body: Buffer.from(await r.arrayBuffer()) });
  });
  page.on("request", (q) => { if (!/^(file|data|blob):/.test(q.url()) && !q.url().startsWith(SERVICE + "/")) outside.push(q.url()); });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => document.title !== "Opening…" && document.querySelector("#x-root main"), null, { timeout: 5000 });
  const out = await page.evaluate(() => ({
    h1: document.querySelector("#x-root h1")?.textContent || "",
    dek: document.querySelector(".x-msg .dek")?.textContent || "",
    signed: document.querySelector(".x-origin .x-signed")?.textContent || "",
    footer: document.querySelector(".x-origin")?.textContent || "",
  }));
  await page.close();
  return { ...out, outside, fetched, errors };
}
const shown = await visit(viewerLink.url);
expect(`viewer: short link did not render (h1 "${shown.h1}", "${shown.dek}")`, shown.h1 === "Short page");
expect(`viewer: no "Signed by" line (got "${shown.signed}")`, shown.signed === "Signed by Test Author.");
expect("viewer: footer should say the page was fetched encrypted", /fetched in encrypted form/.test(shown.footer));
expect(`viewer: should fetch exactly the one stored copy (got ${shown.fetched.join(", ")})`, shown.fetched.length === 1 && shown.fetched[0] === `${SERVICE}/${viewerLink.id}`);
await deleteShort(viewerLink.id, { service: SERVICE, signer: kit.signer, fetchFn });
const gone = await visit(viewerLink.url);
expect(`viewer: withdrawn link was not refused (h1 "${gone.h1}")`, gone.h1 === "This link could not be opened" && gone.dek === SHORT_REFUSED.gone);
const noService = await visit(plain.viewer + viewerLink.url.slice(viewerLink.url.indexOf("#")));
expect(`viewer without a link service: short link not refused ("${noService.dek}")`, noService.dek === SHORT_REFUSED.noservice && !noService.fetched.length);
for (const v of [shown, gone, noService]) {
  if (v.outside.length) fails.push("viewer: requests outside the link service: " + v.outside.join(", "));
  if (v.errors.length) fails.push("viewer: script errors: " + v.errors.join("; "));
}
await browser.close();

console.log(fails.length ? "FAIL\n  • " + fails.join("\n  • ") : "ok — short links open signed and encrypted; unsigned, unknown-key, stale, replayed, oversized, moved, changed, withdrawn and expired ones are refused");
process.exit(fails.length ? 1 : 0);
