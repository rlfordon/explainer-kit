/* shortlinks.mjs — make and withdraw short links (Node only; see lib/short.js for the format).
 *
 * A record of every short link made is kept in ~/.explainer-kit/short-links.json (or the file
 * named by EXPLAINER_KIT_LINKS), beside the signing key and outside every repository. It holds
 * the links themselves, keys included, so the author can find one again; guard it like the key.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { toB64 } from "./codec.js";
import { newShortId, newShortKey, shortFragment, sealShort, uploadMessage, sha256B64, SHORT_RE } from "./short.js";

export const LINKS_FILE = process.env.EXPLAINER_KIT_LINKS || join(homedir(), ".explainer-kit", "short-links.json");

/* "90d", "12h", "2w", "never" → seconds from now (0 for never) */
export function parseExpiry(s = "90d") {
  if (s === "never") return 0;
  const m = String(s).match(/^(\d+)([hdw])$/);
  if (!m || +m[1] === 0) throw new Error(`--expires takes a number and h, d or w (e.g. 90d), or never; not "${s}"`);
  return +m[1] * { h: 3600, d: 86400, w: 604800 }[m[2]];
}

async function signedRequest(service, method, id, body, signer, expires, fetchFn) {
  const time = Math.floor(Date.now() / 1000);
  const sig = toB64(signer.sign(uploadMessage(method, id, expires, time, await sha256B64(body))));
  return fetchFn(`${service}/${id}`, {
    method,
    body: method === "POST" ? body : undefined,
    headers: { "X-Key": signer.id, "X-Time": String(time), "X-Expires": String(expires), "X-Signature": sig, "Content-Type": "application/octet-stream" },
  });
}

/* fragment: a signed long link's #…; viewer: the hosted viewer's address.
 * → { url, id, expires } (expires: Unix seconds, 0 for never) */
export async function createShort(fragment, { service, viewer, signer, expiresIn = parseExpiry(), fetchFn = fetch }) {
  if (!signer) throw new Error("short links carry only signed pages, and there is no signing key");
  if (!/^#\/v\d+\/s/.test(fragment)) throw new Error("short links carry only signed pages");
  const expires = expiresIn ? Math.floor(Date.now() / 1000) + expiresIn : 0;
  for (let attempt = 0; attempt < 3; attempt++) {
    const id = newShortId(), key = newShortKey();
    const body = await sealShort(fragment, id, key);
    const res = await signedRequest(service, "POST", id, body, signer, expires, fetchFn);
    const text = (await res.text()).trim(); // read to the end, so the connection is finished with
    if (res.status === 409) continue; // that id was taken: draw another
    if (res.status !== 201) throw new Error(`the link service refused the upload (${res.status}): ${text}`);
    return { url: viewer + shortFragment(id, key), id, expires };
  }
  throw new Error("the link service kept refusing new ids");
}

/* link: a short link or its id → true if it was there, false if it was already gone */
export async function deleteShort(link, { service, signer, fetchFn = fetch }) {
  const id = idOf(link);
  const res = await signedRequest(service, "DELETE", id, new Uint8Array(0), signer, 0, fetchFn);
  const text = (await res.text()).trim(); // read to the end, so the connection is finished with
  if (res.status !== 200 && res.status !== 404) throw new Error(`the link service refused the deletion (${res.status}): ${text}`);
  return res.status === 200;
}

export function idOf(link) {
  const s = String(link).trim();
  const hash = s.includes("#") ? s.slice(s.indexOf("#")) : "";
  const m = hash.match(SHORT_RE);
  if (m) return m[1].replace(/-/g, "~");
  if (/^[A-Za-z0-9~_]{8}$/.test(s)) return s;
  throw new Error(`"${s}" is not a short link or a short-link id`);
}

export function loadRecord(file = LINKS_FILE) {
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : [];
}

export function saveRecord(list, file = LINKS_FILE) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(list, null, 2) + "\n", { mode: 0o600 });
}
