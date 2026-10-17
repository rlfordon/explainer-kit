/* keyed.mjs — a throwaway signing key and a viewer that trusts only it, so tests never touch
 * the real key in ~/.explainer-kit or the real viewer/index.html. A test viewer has no link
 * service unless given one (test/short.mjs). */
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { buildViewer } from "../build.mjs";
import { newKey, signerOf } from "../lib/keys.mjs";

export function testKit(name = "Test Author", { shortener = "" } = {}) {
  const { secret, pub } = newKey(name);
  const dir = mkdtempSync(join(tmpdir(), "explainer-kit-test-"));
  const v = buildViewer(join(dir, "index.html"), { keys: [pub], shortener });
  return { signer: signerOf(secret), pub, viewer: pathToFileURL(v.out).href };
}
