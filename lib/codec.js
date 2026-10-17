/* codec.js — source text ↔ the part of a link after the #.
 *
 *   #/v1/<flag><payload>     flag z = deflate-raw, r = raw UTF-8 (whichever is shorter)
 *   #/v1/s<flag><key id><signature><payload>     the same, signed
 * The payload is base64url with "~" in place of "-" (a hyphen is a place mail and chat
 * clients break a long line) and a period after every 200 characters (Messages and Signal
 * drop a link with a longer unbroken run). Both ideas are Tiny Little Office's
 * (kit/core/codec.ts). Reading ignores periods and accepts "-" too.
 * No dictionary yet: the browser side uses the native DecompressionStream, which has none.
 *
 * Signing: ECDSA P-256 over SHA-256 (every browser's Web Crypto has it; older iPhones lack
 * Ed25519). The signature (64 bytes, 86 characters) covers SIGN_CONTEXT + flag + newline,
 * then the payload's bytes, and is checked before anything is decompressed. The key id (8
 * characters) says which of the viewer's keys made it. A viewer that holds keys opens only
 * links signed by one of them; a viewer with none opens any link, unchecked.
 */

export const VERSION = 1;
const SPACED = 200;
const KID = 8, SIG = 86;
export const SIGN_CONTEXT = "explainer-kit/v1/";

export function toB64(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = typeof btoa === "function" ? btoa(bin) : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "~").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromB64(s) {
  s = s.replace(/\./g, "").replace(/[~-]/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function spaced(p) {
  return p.replace(new RegExp(`.{${SPACED}}(?=.)`, "g"), "$&.");
}

/* the bytes a signature covers */
export function signedBytes(flag, bytes) {
  const pre = new TextEncoder().encode(SIGN_CONTEXT + flag + "\n");
  const out = new Uint8Array(pre.length + bytes.length);
  out.set(pre);
  out.set(bytes, pre.length);
  return out;
}

/* deflateRaw: (Uint8Array) → Uint8Array, supplied by the caller (node:zlib in the build).
 * signer (optional): { id, sign(Uint8Array) → 64-byte signature }, from lib/keys.mjs. */
export function encodeFragment(src, deflateRaw, signer) {
  const raw = new TextEncoder().encode(src);
  const zb = deflateRaw(raw);
  const z = toB64(zb);
  const r = toB64(raw);
  const [flag, body, bytes] = z.length < r.length ? ["z", z, zb] : ["r", r, raw];
  if (!signer) return `#/v${VERSION}/${flag}${spaced(body)}`;
  const sig = toB64(signer.sign(signedBytes(flag, bytes)));
  if (sig.length !== SIG || signer.id.length !== KID) throw new Error("signer gave a malformed signature or key id");
  return `#/v${VERSION}/s${spaced(flag + signer.id + sig + body)}`;
}

const ASK = " Ask the person who sent it for a new link.";
export const REFUSED = {
  unsigned: "This viewer opens only pages signed by its owner, and this link has no signature." + ASK,
  unknown: "This link was signed with a key this viewer does not recognise." + ASK,
  altered: "This link does not match its signature: it was changed after it was made, or damaged when it was copied." + ASK,
  nocrypto: "This browser could not check the link's signature. Try opening it in an up-to-date browser.",
};

/* true when sig (64 bytes, IEEE P1363) is key's signature over data; key: { x, y } */
export async function verifySig(key, sig, data) {
  const subtle = globalThis.crypto && globalThis.crypto.subtle;
  if (!subtle) throw new Error(REFUSED.nocrypto);
  try {
    const k = await subtle.importKey("jwk", { kty: "EC", crv: "P-256", x: key.x, y: key.y, ext: true },
      { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
    return await subtle.verify({ name: "ECDSA", hash: "SHA-256" }, k, sig, data);
  } catch (e) {
    return false;
  }
}

/* Browser: fragment → { text, signer } (signer: the matching key's name, or null). keys are the
 * viewer's own [{ id, name, x, y }]. Throws with a reader-facing message on a bad or refused link. */
export async function decodeFragment(hash, keys = []) {
  const m = String(hash).match(/^#\/v(\d+)\/([a-z])([A-Za-z0-9~_.\-]+)$/);
  if (!m) throw new Error("This address does not hold an explainer.");
  if (+m[1] !== VERSION) throw new Error("This link was made by a different version of the viewer.");
  let flag = m[2], rest = m[3], signer = null, sig = null, key = null;
  if (flag === "s") {
    rest = rest.replace(/\./g, "").replace(/-/g, "~");
    flag = rest[0];
    const id = rest.slice(1, 1 + KID);
    sig = rest.slice(1 + KID, 1 + KID + SIG);
    rest = rest.slice(1 + KID + SIG);
    key = keys.find((k) => k.id === id) || null;
    if (keys.length && !key) throw new Error(REFUSED.unknown);
  } else if (keys.length) {
    throw new Error(REFUSED.unsigned);
  }
  let bytes;
  try { bytes = fromB64(rest); } catch (e) { throw new Error(key ? REFUSED.altered : "This link is damaged: part of it may have been cut off."); }
  if (key) {
    let s;
    try { s = fromB64(sig); } catch (e) { throw new Error(REFUSED.altered); }
    if (s.length !== 64 || !(await verifySig(key, s, signedBytes(flag, bytes)))) throw new Error(REFUSED.altered);
    signer = key.name;
  }
  if (flag === "r") return { text: new TextDecoder().decode(bytes), signer };
  if (flag !== "z") throw new Error("This link uses a format this viewer does not know.");
  try {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    const text = await new Response(stream).text();
    if (text.length > 4 * 1024 * 1024) throw new Error("too large");
    return { text, signer };
  } catch (e) {
    throw new Error("This link is incomplete: it may have been cut off when it was copied or sent.");
  }
}
