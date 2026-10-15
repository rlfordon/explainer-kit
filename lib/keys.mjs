/* keys.mjs — signing keys for links (Node only; the viewer only ever sees public keys).
 *
 * The private key lives outside every repository, in ~/.explainer-kit/signing-key.json (or
 * the file named by EXPLAINER_KIT_KEY). Its public half goes into kit.json "keys", and from
 * there into the viewer, which then opens only links signed by a key on that list. Removing
 * a key from the list and redeploying the viewer revokes every link it signed.
 */
import { generateKeyPairSync, createPrivateKey, createHash, sign } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { toB64, fromB64 } from "./codec.js";

export const KEY_FILE = process.env.EXPLAINER_KIT_KEY || join(homedir(), ".explainer-kit", "signing-key.json");

/* 8 characters naming a public key in a link: the start of SHA-256 over its x and y */
export function keyId(x, y) {
  return toB64(createHash("sha256").update(fromB64(x)).update(fromB64(y)).digest()).slice(0, 8);
}

/* a new P-256 key pair: { secret: what goes in KEY_FILE, pub: what goes in kit.json "keys" } */
export function newKey(name) {
  const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
  const jwk = privateKey.export({ format: "jwk" });
  const id = keyId(jwk.x, jwk.y);
  const created = new Date().toISOString().slice(0, 10);
  return { secret: { id, name, created, jwk }, pub: { id, name, created, x: jwk.x, y: jwk.y } };
}

/* { id, name, sign(bytes) → 64-byte signature } for encodeFragment */
export function signerOf(secret) {
  const key = createPrivateKey({ key: secret.jwk, format: "jwk" });
  return { id: secret.id, name: secret.name, sign: (data) => sign("sha256", data, { key, dsaEncoding: "ieee-p1363" }) };
}

export function loadSigner(file = KEY_FILE) {
  return existsSync(file) ? signerOf(JSON.parse(readFileSync(file, "utf8"))) : null;
}

export function saveSecret(secret, file = KEY_FILE) {
  if (existsSync(file)) throw new Error(`a signing key already exists at ${file}; move it aside first if you really mean to replace it`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(secret, null, 2) + "\n", { mode: 0o600, flag: "wx" });
}

/* public keys in the shape the viewer wants, dropping anything malformed */
export function publicKeys(list = []) {
  return list.filter((k) => k && /^[A-Za-z0-9~_]{8}$/.test(k.id) && /^[A-Za-z0-9_-]{43}$/.test(k.x) && /^[A-Za-z0-9_-]{43}$/.test(k.y))
    .map((k) => ({ id: k.id, name: String(k.name || "the owner of this viewer"), x: k.x, y: k.y }));
}
