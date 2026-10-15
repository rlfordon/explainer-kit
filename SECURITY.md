# Security

How explainer-kit keeps a shared page safe, what it does not protect, and what is coming.
The README has the technical detail; [ROADMAP.md](ROADMAP.md) has the plans and open decisions.

Two roles appear throughout. The **author** writes pages and holds the private signing key.
The **host website** is the author's own site, which serves the viewer page that opens links.
Both are set in `kit.json`: `"viewer"` is the viewer's address on the host website, and each
entry in `"keys"` is an author's public key with the name readers see.

## In short

- A link is the page itself, packed into the part of the address after the `#`. Browsers
  never send that part to any server, so the page is stored nowhere: not on the website,
  not on any service.
- The viewer that opens links, a single static page on the author's own website (the host
  website), **never runs code from a link**, **never sends anything anywhere**, and **opens
  only pages signed by the author's key**.
- **Anyone who has a link can read the page.** Links are not yet encrypted, so treat a link
  like the page itself: do not put anything in one that you would not send by plain email.

## The problem this is designed against

A viewer like this one draws whatever the link contains, under the address of the site that
hosts it. If it would run code from a link, anyone could write a link that shows a fake login
page or quietly sends whatever a reader types to their own server, all under the host
website's address, where it would look trustworthy.

Tiny Little Office, the project this kit borrows the link-as-document idea from, hit exactly
this. Paul Ford removed one of its apps on 2026-10-11 and recorded why in its design notes
([docs/kernel.md, Decision 3](https://github.com/aboard-io/tinylittleoffice/blob/73e257387c0f684f825c766210a4519295f3920d/docs/kernel.md#L306)):

> It rendered arbitrary HTML, CSS and script from a link inside a page served from
> tinylittleoffice.com, a phishing kit with our domain on it, which no sandbox makes safe.
> A document never runs code.

explainer-kit adopts the same rule, and adds signing so that strangers cannot use the
viewer's address at all.

## How it is set up now

### 1. A link is data, never code

A link carries text and settings in the kit's Markdown format. The viewer draws them only
with widgets already built into it (timelines, decision trees, calculators and so on).

- Every piece of text is escaped, so text can never become a tag or a script.
- Links in a page may only be `https`, `mailto`, `tel` or in-page `#` links.
- Colours and font names are checked against what is allowed. A link cannot add its own
  styling, which could otherwise hide parts of the page or draw a fake "Signed by" line.
- Raw HTML, custom styling and custom demos are dropped from links. They work only in the
  standalone file version (see below).
- Calculators and threshold demos use a small formula language that the kit reads itself and
  never hands to the browser to run. A hostile formula can produce a wrong number and nothing
  else. It has no loops and cannot reach anything outside the page.

### 2. Nothing leaves the reader's browser

The viewer's Content Security Policy is the browser-enforced rulebook for the page. It
allows only the viewer's own script (identified by its exact fingerprint) and fonts from the
viewer's own folder. It blocks every other request: no outside images, no connections to
other servers, no forms that submit anywhere. Even a mistake in the kit could not send the
page out.

- The fonts are hosted next to the viewer, so opening a link never contacts Google or any
  font service.
- The viewer sends no referrer, so a site the reader goes to from a page does not learn
  where they came from.
- Checklist ticks are not saved when reading a link, so nothing is left on the reader's
  device by the page.
- The viewer is marked `noindex`, so search engines leave it out. Keep it out of the host
  website's sitemap too.

What servers can see: the host website (and the company that hosts it, such as GitHub Pages)
sees that someone loaded the viewer (their IP address and the time), the same as any web page. It never sees which page they
opened, because the page lives in the part of the address browsers keep to themselves.

### 3. Only the author's pages open (signing)

Every link is signed with the author's private key, and the viewer opens only links whose
signature matches a public key built into it.

- **A stranger cannot use the viewer.** A link without a valid signature is refused, with a
  plain message. Reading the viewer's code does not help: the public key can check a
  signature, but only the private key can make one.
- **A changed page will not open.** The signature covers the whole page, so a link that was
  altered after it was made, even by one character, is refused.
- **Readers see who made it.** Each page ends with *Signed by* and the author's name, as given
  when the key was made. That name comes from the viewer's own list, never from the link.
- **Technical detail:** ECDSA P-256 with SHA-256, checked in the browser with Web Crypto
  before anything in the link is unpacked.

A signature proves who made the page and that it is unchanged. The viewer still draws a
signed page with the trusted widgets only, so a stolen key would let someone show text under
the author's name, but never run code.

### 4. Tested on every change

| Test | What it proves |
|---|---|
| `test/security.mjs` | A deliberately hostile link (scripts, event handlers, bad URLs, CSS tricks, hostile formulas, attacks aimed at the widgets) renders inert: no script runs, no dialog opens, no request goes out. |
| `test/signing.mjs` | Signed links open. Unsigned, unknown-key, altered, borrowed-signature and cut-off links are refused. |
| `test/expr.mjs` | Formulas give the right answers and hostile ones are rejected. |
| `test/check.mjs` | Clicks through a page and lists every network request it makes. |
| `test/live.mjs` | The live viewer on the website opens a signed link and refuses an unsigned one. |

## What a link does not protect

- **Whoever holds the link can read the page.** A forwarded link works for the person it was
  forwarded to. Email providers keep a copy of every link in their mailboxes, and a browser
  keeps opened links in its history (and syncs that history if the reader has turned
  syncing on).
- **One link cannot be withdrawn.** Today the only way to stop a link opening is to retire
  the key that signed it, which stops every link that key signed.
- **Long links can break.** Some apps cut long addresses. A damaged link is refused, never
  shown in part.

## Standalone files are different

The build can also make a standalone HTML file. A file is not covered by the link rules
above, by design: it may carry custom code, custom styling and interactive demos, it loads its
fonts from Google Fonts, and with `--chat` it includes a chat box that sends the page and the
reader's questions to an AI provider using a key the reader enters. A file is for public
explainers and for pages you choose to send as an attachment. Client pages that must stay
private should go as links.

## Keeping it safe: what depends on the author

- **The private key** is the file `~/.explainer-kit/signing-key.json`, outside every
  repository. It is not encrypted on disk, so anyone with access to the computer's user
  account could copy it. Back it up somewhere safe, such as a password manager.
- **If the key is lost or stolen**, remove its entry from `kit.json` `"keys"`, rebuild the
  viewer and deploy it. Every link it signed stops opening. Make a new key with
  `node build.mjs --keygen` and re-send any links still needed.
- **The account that publishes the host website is the deepest point of trust.** Someone who
  took it over (a GitHub account, for a site on GitHub Pages) could replace the viewer itself.
  Keep two-factor authentication on for it, and for any service added later.
- **The source code is public.** That is fine: nothing in the design depends on keeping the
  code secret, only the private key.

## What is coming

| Plan | What it changes | Status |
|---|---|---|
| **Short links** | A link of about 80 characters, for text messages and QR codes. The page is encrypted on the author's computer, and only the encrypted copy is stored, on a small Cloudflare service the author runs. The key to unlock it stays in the short link, so Cloudflare cannot read the pages. Only the author can create links, and each one can expire or be deleted on its own. The trade-off: Cloudflare can see when each short link is opened, and from what IP address. The long link stays as a backup. | Decided, to be built next |
| **Sealing** | Encrypts the page with a password sent separately, following Tiny Little Office's sealed form. A forwarded link alone is then not enough to read it, and every mailbox holds only scrambled text. The signature is checked before the reader is asked for the password, so a forged link is refused first. | Planned |
| **Custom demos in signed links** | Would let a signed link carry a custom interactive demo, run in a sealed-off frame that cannot touch the site or make network requests. It reopens part of the problem above, contained by the frame and the signature, and makes links much longer. | Open decision |
| **Opt-in chat in links** | A button where the reader enters their own AI key. The page and their questions would go to the AI provider, by the reader's choice, and the "nothing was sent" note would change while chat is on. | Open decision |
| **Review & edit in the viewer** | Lets a reader suggest edits and send back a new link. | Planned |
