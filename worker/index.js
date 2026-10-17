/* worker/index.js — the short-link service: a Cloudflare Worker holding encrypted pages in KV.
 *
 *   GET    /<id>   → the stored ciphertext (anyone may fetch it; without the key in the short
 *                    link it is unreadable)
 *   POST   /<id>   → store the request body under a new id     } signed with an author's key
 *   DELETE /<id>   → withdraw it                               } (lib/short.js uploadMessage)
 *
 * Signed requests carry X-Key (key id), X-Time, X-Expires (Unix seconds, 0 for never) and
 * X-Signature, over method, id, expiry, time and the body's SHA-256. The trusted keys are
 * kit.json "keys", built in at deploy. A request more than 5 minutes off is refused; a
 * deleted id is remembered for 10 minutes so a replayed upload cannot bring it back; and an
 * id is never overwritten. It serves no HTML, so its address cannot carry a page of its own.
 */
import kit from "../kit.json" with { type: "json" };
import { verifySig, fromB64 } from "../lib/codec.js";
import { ID_RE, MAX_SEALED, uploadMessage, sha256B64 } from "../lib/short.js";

const SKEW = 300, TOMBSTONE = 600;
const KIT_KEYS = (kit.keys || []).filter((k) => k && typeof k.id === "string" && typeof k.x === "string" && typeof k.y === "string");

const BASE = {
  "Content-Type": "text/plain; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; sandbox",
  // the ciphertext is no secret (the key never reaches this service), so any page may fetch it
  "Access-Control-Allow-Origin": "*",
};
const reply = (status, body = "", extra = {}) => new Response(body, { status, headers: { ...BASE, ...extra } });

async function authorise(request, id, body, keys, now) {
  const h = (n) => request.headers.get(n) || "";
  const key = keys.find((k) => k.id === h("X-Key"));
  if (!key) return "unknown key";
  const time = Number(h("X-Time")), expires = Number(h("X-Expires"));
  if (!Number.isSafeInteger(time) || Math.abs(now - time) > SKEW) return "time out of range (check this computer's clock)";
  if (!Number.isSafeInteger(expires) || expires < 0) return "bad expiry";
  let sig;
  try { sig = fromB64(h("X-Signature")); } catch (e) { return "bad signature"; }
  const msg = uploadMessage(request.method, id, expires, time, await sha256B64(body));
  if (sig.length !== 64 || !(await verifySig(key, sig, msg))) return "bad signature";
  return { expires };
}

/* env.LINKS: the KV namespace. opts.keys and opts.now (Unix seconds) are for tests. */
export async function handle(request, env, { keys = KIT_KEYS, now = Math.floor(Date.now() / 1000) } = {}) {
  const id = decodeURIComponent(new URL(request.url).pathname.slice(1));
  if (!ID_RE.test(id)) return reply(404, "explainer-kit link service\n");

  if (request.method === "GET" || request.method === "HEAD") {
    const bytes = await env.LINKS.get(id, "arrayBuffer");
    if (!bytes) return reply(404, "not found\n");
    return reply(200, request.method === "HEAD" ? null : bytes, { "Content-Type": "application/octet-stream" });
  }

  if (request.method === "POST") {
    const len = Number(request.headers.get("Content-Length") || 0);
    if (len > MAX_SEALED) return reply(413, "too large\n");
    const body = new Uint8Array(await request.arrayBuffer());
    if (body.length > MAX_SEALED) return reply(413, "too large\n");
    if (body.length < 29) return reply(400, "empty\n");
    const ok = await authorise(request, id, body, keys, now);
    if (typeof ok === "string") return reply(403, ok + "\n");
    if (ok.expires && ok.expires < now + 120) return reply(400, "expiry must be at least two minutes away\n");
    if ((await env.LINKS.get(id)) !== null || (await env.LINKS.get("gone:" + id)) !== null) return reply(409, "id already used\n");
    await env.LINKS.put(id, body, ok.expires ? { expiration: ok.expires } : {});
    return reply(201, "stored\n");
  }

  if (request.method === "DELETE") {
    const ok = await authorise(request, id, new Uint8Array(0), keys, now);
    if (typeof ok === "string") return reply(403, ok + "\n");
    const had = (await env.LINKS.get(id)) !== null;
    await env.LINKS.put("gone:" + id, "1", { expirationTtl: TOMBSTONE });
    await env.LINKS.delete(id);
    return reply(had ? 200 : 404, had ? "deleted\n" : "not found\n");
  }

  return reply(405, "method not allowed\n", { Allow: "GET, HEAD, POST, DELETE" });
}

export default { fetch: (request, env) => handle(request, env) };
