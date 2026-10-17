/* boot.js — the link viewer. Reads the fragment, renders it with the trusted widget set, and
 * hydrates. It fetches nothing but its own theme fonts (the page's CSP allows only those),
 * never runs code from the link (page.js in "link" mode passes no raw HTML or script
 * through), and keeps in-page links from rewriting the fragment, which is the document.
 * ?theme=<name> before the # swaps the page's theme (a named theme, nothing else).
 * The public keys in #x-keys (put there by the build) are the only authors it trusts: with
 * any, it opens only links one of them signed (lib/codec.js checks before decompressing).
 * A short link (#/v1/k…) names an encrypted copy on the link service in #x-short, the one
 * address the CSP lets it fetch from; the key stays here, and the page inside is checked
 * against the same keys (lib/short.js). */
import { decodeFragment } from "../lib/codec.js";
import { openShort, SHORT_RE } from "../lib/short.js";
import { renderPage } from "../lib/page.js";
import { themeCss, THEMES } from "../lib/theme.js";
import { esc } from "../lib/md.js";
import { HYDRATE } from "./hydrate.js";

const root = document.getElementById("x-root");
const theme = document.getElementById("x-theme");
let keys = [];
try { keys = JSON.parse(document.getElementById("x-keys").textContent) || []; } catch (e) { keys = []; }
let service = "";
try { service = JSON.parse(document.getElementById("x-short").textContent) || ""; } catch (e) { service = ""; }
let shown = "";

const NOTE = {
  long: "Nothing in this page is sent anywhere: the explainer lives in the link itself, after the #, and is read only by your browser.",
  short: "A short link fetches an encrypted copy of the page. The key that unlocks it is in your link, after the #, and never leaves your browser.",
};

function message(title, body, short = SHORT_RE.test(location.hash)) {
  document.title = title;
  theme.textContent = themeCss({});
  root.innerHTML = '<main class="x-msg"><div class="wrap"><p class="eyebrow">Explainer viewer</p><h1></h1><p class="dek"></p>' +
    `<p class="note">${short ? NOTE.short : NOTE.long}</p></div></main>`;
  root.querySelector("h1").textContent = title;
  root.querySelector(".dek").textContent = body;
}

async function show() {
  const hash = location.hash;
  if (hash === shown) return;
  if (!hash || hash === "#") { shown = hash; message("Nothing to show yet", "Open an explainer link to read it here."); return; }
  if (!/^#\/v\d+\//.test(hash)) return; // an in-page anchor typed by hand
  shown = hash;
  let src, signer;
  const short = SHORT_RE.test(hash);
  if (short) message("Opening…", "Fetching the encrypted page. It is unlocked here, in your browser.");
  try { ({ text: src, signer } = short ? await openShort(hash, keys, service) : await decodeFragment(hash, keys)); }
  catch (e) { message("This link could not be opened", e.message); return; }
  if (location.hash !== hash) return; // the reader moved on while it was being checked
  const page = renderPage(src, { mode: "link" });
  document.title = page.title || "Explainer";
  if (page.head.lang && /^[a-z]{2}(-[A-Za-z]{2})?$/.test(page.head.lang)) document.documentElement.lang = page.head.lang;
  const pick = new URLSearchParams(location.search).get("theme");
  const head = pick && Object.prototype.hasOwnProperty.call(THEMES, pick) ? { ...page.head, theme: pick, accent: "" } : page.head;
  theme.textContent = themeCss(head, { hosted: true });
  // Say where the page came from: signed by a key this viewer holds, or (in a viewer with no
  // keys) from whoever wrote the link.
  // A short link's page was fetched, encrypted, from the link service: say so.
  const origin = signer
    ? `<span class="x-signed">Signed by ${esc(signer)}.</span> ` + (short
      ? `This page was fetched in encrypted form, unlocked in this browser with the key in your link, and checked against ${esc(signer)}’s key. The service that stores it cannot read it.`
      : `This page lives in the link you opened, and was checked against ${esc(signer)}’s key in this browser. Nothing in it was sent to any server.`)
    : short
      ? "This page came from the link you opened, fetched in encrypted form and unlocked in this browser. It is not published by this site."
      : "This page came from the link you opened. It is not published by this site, and nothing in it was sent to any server: the page lives in the link itself.";
  root.innerHTML = page.html + `<footer class="x-origin"><div class="wrap">${origin}</div></footer>`;
  for (const el of root.querySelectorAll("[data-w]")) {
    const f = HYDRATE[el.dataset.w];
    if (f) { try { f(el); } catch (e) { console.error(el.dataset.w, e); } }
  }
  window.scrollTo(0, 0);
}

// In-page links scroll; they must not replace the fragment, which holds the document.
document.addEventListener("click", (e) => {
  const a = e.target.closest && e.target.closest('a[href^="#"]');
  if (!a || e.defaultPrevented) return;
  e.preventDefault();
  const id = decodeURIComponent(a.getAttribute("href").slice(1));
  const t = id ? document.getElementById(id) : null;
  (t || document.body).scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth", block: "start" });
  if (t && t.matches("main")) t.focus({ preventScroll: true });
});

window.addEventListener("hashchange", show);
show();
