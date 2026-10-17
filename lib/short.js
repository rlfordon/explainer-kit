/* short.js — short links: a signed link, encrypted, stored on the link service, opened by an
 * address of about 80 characters.
 *
 *   #/v1/k<id><key>      id: 8 characters naming the stored copy; key: 22 characters (128 bits)
 *
 * The author's computer encrypts the whole signed fragment (codec.js) with a fresh AES-GCM key
 * and uploads only the ciphertext. The key stays in the short link, after the #, so neither
 * the website nor the link service ever sees it, and the service holds nothing it can read.
 * The viewer fetches the ciphertext by id, decrypts it in the browser, and then checks the
 * inner link's signature exactly as it would a long link: the service can withhold a page
 * but cannot change one (AES-GCM refuses altered bytes, and the signature refuses anything
 * the author did not sign).
 *
 * Uploads and deletions are signed with the author's key (uploadMessage), so only an author
 * the service trusts can store anything. Used by the viewer (boot.js), the build
 * (shortlinks.mjs) and the service (worker/index.js).
 */
import { toB64, fromB64, decodeFragment } from "./codec.js";

export const SHORT_RE = /^#\/v1\/k([A-Za-z0-9~_\-]{8})([A-Za-z0-9~_\-]{22})$/;
export const ID_RE = /^[A-Za-z0-9~_]{8}$/;
export const MAX_SEALED = 1024 * 1024; // bytes of ciphertext; a 100,000-character link is about 75 KB
const AAD = "explainer-kit/short/v1/";
const IV = 12;

const ASK = " Ask the person who sent it for a new link.";
export const SHORT_REFUSED = {
  gone: "This link has expired, or the person who sent it has withdrawn it." + ASK,
  offline: "The page could not be fetched. Check your connection and try again. If it keeps failing, ask the person who sent it for the long version of the link.",
  damaged: "This link is damaged: part of it was changed or cut off when it was copied." + ASK,
  noservice: "This viewer is not set up to open short links." + ASK,
};

const rand = (n) => crypto.getRandomValues(new Uint8Array(n));
export const newShortId = () => toB64(rand(6));
export const newShortKey = () => toB64(rand(16));
export const shortFragment = (id, key) => `#/v1/k${id}${key}`;

function aesKey(key, use) {
  const raw = fromB64(key);
  if (raw.length !== 16) throw new Error("bad key");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, [use]);
}

/* fragment (a signed long link's #…) → iv + ciphertext; the id is bound in as associated data,
 * so a copy stored under another id does not decrypt */
export async function sealShort(fragment, id, key) {
  const iv = rand(IV);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: new TextEncoder().encode(AAD + id) },
    await aesKey(key, "encrypt"), new TextEncoder().encode(fragment)));
  const out = new Uint8Array(IV + ct.length);
  out.set(iv);
  out.set(ct, IV);
  return out;
}

export async function openSealed(bytes, id, key) {
  if (bytes.length <= IV + 16) throw new Error("too short");
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.slice(0, IV), additionalData: new TextEncoder().encode(AAD + id) },
    await aesKey(key, "decrypt"), bytes.slice(IV));
  return new TextDecoder().decode(pt);
}

/* What an upload (POST) or deletion (DELETE) is signed over. expires: Unix seconds, 0 for
 * never; time: Unix seconds when signed (the service refuses one more than 5 minutes off);
 * bodyHash: base64 of SHA-256 over the request body (empty for DELETE). */
export function uploadMessage(method, id, expires, time, bodyHash) {
  return new TextEncoder().encode(`${AAD}${method}\n${id}\n${expires}\n${time}\n${bodyHash}`);
}

export async function sha256B64(bytes) {
  return toB64(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}

/* Browser: short fragment → { text, signer }, like decodeFragment. service: the link service's
 * origin (from the viewer's build). get: fetch, replaceable in tests. */
export async function openShort(hash, keys, service, get = (u, o) => fetch(u, o)) {
  const m = String(hash).match(SHORT_RE);
  if (!m) throw new Error("This address does not hold an explainer.");
  if (!service) throw new Error(SHORT_REFUSED.noservice);
  const id = m[1].replace(/-/g, "~"), key = m[2].replace(/-/g, "~");
  let res, bytes;
  try {
    res = await get(`${service}/${id}`, { credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store" });
    if (res.ok) bytes = new Uint8Array(await res.arrayBuffer());
  } catch (e) {
    throw new Error(SHORT_REFUSED.offline);
  }
  if (res.status === 404 || res.status === 410) throw new Error(SHORT_REFUSED.gone);
  if (!res.ok) throw new Error(SHORT_REFUSED.offline);
  if (bytes.length > MAX_SEALED) throw new Error(SHORT_REFUSED.damaged);
  let inner;
  try { inner = await openSealed(bytes, id, key); } catch (e) { throw new Error(SHORT_REFUSED.damaged); }
  return decodeFragment(inner, keys); // the signature check, exactly as for a long link
}
