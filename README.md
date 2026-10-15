# explainer-kit

Modular explainers. You write one Markdown file; the build turns it into either

- **a standalone HTML page** — like the pages [html-explainer](../html-explainer) makes, with its
  Review & edit overlay — or
- **a private link** — the whole page compressed into the part of the address after the `#`,
  opened by a small viewer page. Browsers never send that part to any server, so the page is
  hosted nowhere: whoever has the link has the page.

It melds two projects. From **html-explainer** it takes the design system and the widgets
(the timeline, router, tracer and quiz come from `fbi-cia-nsa.html`). From
**[Tiny Little Office](https://github.com/aboard-io/tinylittleoffice)** it takes the idea that
the document is the link, the Markdown-with-fences format, and the rule that a link never runs
code: the viewer draws only its own trusted widgets, every string escaped.

## Quick start

```sh
npm install                                    # Playwright, for the tests only
node build.mjs examples/client-options.md      # → examples/client-options.html
node build.mjs examples/client-options.md --link   # → prints a link to viewer/index.html#…
node build.mjs examples/client-options.md --check  # warnings and link size; writes nothing
node test/check.mjs examples/client-options.html --shots shots/   # click everything, screenshot
node test/security.mjs                         # a hostile link must render inert
node test/signing.mjs                          # unsigned or altered links must be refused
node test/expr.mjs                             # formulas: right answers, hostile ones rejected
node test/live.mjs                             # the hosted viewer opens signed links only
```

Build flags: `-o out.html`, `--no-review` (skip the overlay), `--chat` (add the chat dock),
`--viewer https://…/` (where your hosted viewer lives, for `--link`), `--viewer-only`,
`--keygen --name "Name"` (make a signing key; see *Signing*).

| Example | Source | File | Link |
|---|---|---|---|
| `examples/client-options.md` — a client page: timeline, options, decision tree, next steps | 6 KB | 70 KB | 3,285 chars, signed (chat-friendly) |
| `examples/fbi-cia-nsa.md` — a full port of `html-explainer/fbi-cia-nsa.html` | 32 KB | 110 KB | 14,882 chars, signed (email) |
| `examples/jev-legal-research.md` — the Jev legal-research guide: catalog, triage, calc, bars | 32 KB | 178 KB | 18,415 chars, signed (very long) |
| `examples/jev-beyond-classification.md` — the Jev pattern atlas: waffle, catalog, triage, locator, splits | 31 KB | 204 KB | 16,325 chars, signed (email) |

## The source format

```markdown
---
title: Your options after the demand letter
dek: One or two sentences under the title.
brand: Northwind Bakeries · Supply dispute      (nav bar label; defaults to the title)
theme: brief | counsel | field-guide | night     (see Themes)
accent: #2f4f6f                                 (optional: override the theme's accent)
colors: us=#2f4f6f them=#8e3131 court=#2c6a4f   (topic colours; see [chips] below)
fonts: Newsreader / IBM Plex Sans / IBM Plex Mono   (optional: override the theme's fonts)
by: Prepared by Example LLP
meta: 14 Oct 2026 · Privileged and confidential  (the strip under the hero)
foot: A closing line at the bottom of the page.
---

Anything here, before the first ##, goes in the hero (e.g. a ```cards {.mono} block).

## A section heading {#id nav="Short label" .band .dark .split-head .sources}

First paragraph marked as the lede. {.lede}

Ordinary Markdown: paragraphs, lists, > quotes, ### subheads, tables.

|

A paragraph that is only "|" starts a new column.

---

A --- line ends the columns and goes back to full width.
```

- **Sections** are numbered `§01, §02…` with the `nav` label as the eyebrow, and alternate
  plain/band backgrounds on their own. `.dark` makes a dark band (every widget inside follows).
  `.sources` styles the list as sources and skips the number. `cols="1.15 .85"` sets column
  widths; `colstyle=rule` gives columns a top rule (the oversight layout).
- **Any block** can end with `{#id .class key=value}`, on its last line or the next line.
  Useful classes: `.lede`, `.note`, `.kicker`, `.foot` on paragraphs; `.compare` on a table
  (first column becomes row headers; a header cell can take `{.topic}`).
- **Inline**: `**bold**`, `*italic*`, `` `code` ``, `==highlight==`, `[text](https://…)`, and
  spans: `[FBI]{.fbi}` is a chip in that topic colour; `[Yes]{.yes}`, `[No]{.no}`,
  `[Approved]{.ok}`, `[No court]{.bad}`, `[Watch this]{.warn}`, `[Verify first]{.flag}`,
  `[(1981)]{.muted}`.

### Themes

A theme is a palette, a font pairing and a few type adjustments, chosen with `theme:` — the
way a Tiny Little Office deck picks `theme: boardroom`. Defined in `lib/theme.js`.

| Theme | Look | Fonts | For |
|---|---|---|---|
| `brief` (default) | cool paper, plum accent | Newsreader / IBM Plex Sans / Plex Mono | policy and public explainers (the fbi page) |
| `counsel` | warm paper, slate-blue accent, serif text | Source Serif 4 / IBM Plex Sans / Plex Mono | client pages: reads like a letter |
| `field-guide` | bright paper, violet accent, heavy grotesque headlines | Bricolage Grotesque / IBM Plex Sans / Plex Mono | tools and how-tos (the Jev pages) |
| `night` | dark ink | Newsreader / IBM Plex Sans / Plex Mono | presentations, late reading |

The link viewer serves these five families itself from `fonts/` (Latin subsets, SIL Open Font
License; `node scripts/fetch-fonts.mjs` refreshes them), so a link never contacts Google. In a
link, `fonts:` may only name those five. To preview another theme on any link, put
`?theme=night` (or any theme name) before the `#`.

### Widgets

A fence whose language names a widget renders that widget. Tables inside fences need no
`--- | ---` row. Each widget's file has its full grammar in its opening comment.

| Widget | For | Body |
|---|---|---|
| `timeline` | chronologies, true to scale (or `scale=even` for case chronologies); `today=YYYY-MM-DD` marks today and hollows later events | `Date or Year \| Kind \| Title \| Detail`; `key="name=Label; …"` |
| `router` | "set the facts, get the answer" | table; `:option` columns become controls, the rest is the verdict |
| `stepper` | walk through stages, optionally per scenario | list of `**Track** text` with numbered `**Stage** text` children |
| `tree` | decision trees | nested list; an answer ends `-> outcome` or nests the next question |
| `quiz` | knowledge checks | numbered questions, `- [x]`/`- [ ]` options, `>` why |
| `checklist` | next steps | `- [ ]` list (remembered in a file, never in a link) |
| `cards` | hero cards `{.mono}`, short labelled items `{.rule}` `{.boxed}` | `Tag \| Text` or `Kicker \| Title \| Text` |
| `stats` | headline figures | `Label \| Value` |
| `myths` | misconceptions | `- claim` with `> correction` |
| `callout` | `kind=note\|key\|warn\|flag title="…"` | Markdown |
| `deeper` | folded "go deeper" text, `title="…"` | Markdown |
| `glossary` | terms, or `{.grid}` for a definitions grid | `Term \| Meaning` |
| `bars` | bar charts; `.stack` for one part-to-whole bar, `.peak` to highlight the largest | `Label \| Value` (shown as written; `max=` sets the scale) |
| `waffle` | one square per item, coloured by category | `Category \| Count \| Colour`; a count of `rest` fills up to `total=` |
| `calc` | calculators: sliders, choices and presets feeding formulas | one instruction per line: `slider`, `choice`, `preset`, `let`, `result`, `meter`, `say` |
| `triage` | scored items split by two thresholds, with errors and a scenario switch | `class` lines, scores per class, `scenario`, `zone` and `say` lines |
| `catalog` | filter, search and browse a set of items: grouped rows, or a `.split` list and detail | a table with `:facet`, `:group`, `:detail` and `:code` columns |
| `locator` | where in a document the answer lives; remove a sentence to see what drove it | `question:` and `passage Label:` lines |
| `splits` | debugging a set of categories from how items split between them | `categories:`, seeded item groups, `fix` merges |

Interactive widgets take `title="…" hint="…"` and sit in the shared demo card.

**Formulas.** `calc` and `triage` compute with formulas written in a small language of their
own (`lib/expr.js`): numbers, `+ - * / % ^`, comparisons, `&& || !`, `a ? b : c`, and the
functions `min max abs round floor ceil sqrt exp ln log10 pow clamp sigmoid logit sign`.
Text can show a live value with `{formula}` or `{formula | format}`, where the format is one
of `int count money percent pct1 duration dec0`–`dec3`. The kit parses a formula itself and
never hands it to the browser to run, so a link can carry a calculator safely.

### Custom pieces (file target only)

- ```` ```html ```` — raw HTML, inserted as written.
- ```` ```style ```` — CSS added to the page.
- ```` ```demo {title="…"} ```` — HTML with its own `<script>`, in the demo card.

In a link these become a "runs only in the full version" placeholder (`style` is dropped),
and `--check` says so. That is the trade: a public explainer can carry a bespoke centrepiece;
a link carries only the trusted widgets.

## The link and the viewer

`build.mjs --link` compresses the **source text** (deflate-raw, base64url with `~` for `-`,
a period every 200 characters so Messages and Signal keep it whole — both tricks from Tiny
Little Office) and appends it to the viewer's address: `viewer/index.html#/v1/z…`.

`viewer/index.html` is one static file. Host it anywhere static (GitHub Pages, a firm's own
domain). **It is live at https://rlfordon.github.io/explainer/** (the website repo's
`public/explainer/`). `kit.json` names that address, so `--link` prints a share link for it
next to the local one, and `--viewer-only` also writes the website's copy; commit and push
the website to deploy a new viewer. Old links keep working as long as the format version
(`#/v1/`) is unchanged and their key is still on the viewer's list. Each rendered page ends
with a line saying who signed it. Its guarantees, all tested:

- **Nothing leaves the browser.** Its CSP is `default-src 'none'` with only its own script
  (by hash) and fonts from its own folder (`font-src 'self'`) allowed; the only requests are
  the viewer page and the theme's fonts, never the page content. `test/check.mjs` confirms it.
- **Never runs code from the link.** The renderer escapes every string, allows only
  `https`, `mailto`, `tel` and `#` links, validates every colour and font name, and passes no
  raw HTML, CSS or script through. `test/security.mjs` throws a hostile link at it.
- **The fragment is the document**, so in-page links scroll instead of rewriting it.
- **Leaves nothing behind**: checklist ticks are not stored when reading a link.
- **Opens only signed links.** See below. `test/signing.mjs` checks it.

What a link does *not* do yet: it is not encrypted (anyone who sees the link can read the
page), and one link cannot expire or be revoked on its own. See *Next*.

### Signing

The viewer opens only links signed by a key on its list, so nobody else can use your
viewer's address to show their own page, and a page that was changed after you made it
will not open. The reader sees *Signed by Rebecca Fordon* at the foot of the page. The name
comes from the viewer's list, never from the link.

- **Making a key**: `node build.mjs --keygen --name "Rebecca Fordon"`. This writes the private key to
  `~/.explainer-kit/signing-key.json`, outside every repository (`EXPLAINER_KIT_KEY` names
  another file), and adds its public half to `kit.json` `"keys"`. Then rebuild the viewer
  (`--viewer-only`) and deploy it. From then on `--link` signs every link. It refuses to make
  a link if the key is missing, since the viewer would refuse the link anyway.
- **Back up the private key** somewhere safe (a password manager works). If it is lost, links
  already sent keep opening, but you cannot make new ones with it. Make a new key, which
  is added to the list beside the old one.
- **Revoking**: if the key is stolen or a device is lost, delete its entry from `kit.json`
  `"keys"`, rebuild and deploy the viewer. Every link that key signed stops opening, and
  readers see *signed with a key this viewer does not recognise*. Make a new key, and
  re-send any links you still need.
- **What a signature proves**: who made the page, and that it is unchanged. It does not prove
  the page is harmless: the viewer still renders a signed page with the trusted widgets only.
- **The format**: `#/v1/s` + the inner flag (`z` or `r`) + an 8-character key id + an
  86-character ECDSA P-256 / SHA-256 signature + the payload. That adds about 100
  characters. The signature covers the flag and the payload's bytes, and the viewer checks
  it in the browser (Web Crypto) before decompressing anything. A viewer built with no keys
  opens any link, unchecked, as before.

## Layout

```
build.mjs            the CLI: file, link, viewer, --check
lib/md.js            parser + inline renderer + escaping (runs in Node and the browser)
lib/page.js          page shell, sections, columns, tables; dispatches fences to widgets
lib/theme.js         palettes, tokens, topic colours, fonts
lib/widgets.js       the widget registry
lib/codec.js         source ↔ fragment; signature check (runs in Node and the browser)
lib/keys.mjs         signing keys: make, load, sign (Node only)
lib/bundle.mjs       a tiny bundler, so the viewer and pages ship one inline script
lib/expr.js          the formula language and number formats (calc, triage)
lib/live.js          live {formula} values inside widget text
lib/rand.js          seeded randomness, so generated demos look the same on every load
widgets/*.js         renderers (static HTML, readable without script, printable)
widgets/run/*.js     runtimes (hydrate [data-w] elements)
widgets/css/*.css    one stylesheet per widget; css/base.css is the shared shell
viewer/              boot.js + hydrate.js + viewer.css → index.html (generated)
vendor/html-explainer/  review-mode.js, chat-dock.js, assemble.mjs (MIT, Derek Schwede)
test/                check.mjs (exercise + screenshot), security.mjs + evil.md, signing.mjs,
                     keyed.mjs (a throwaway key and viewer, so tests never touch yours),
                     expr.mjs, live.mjs; widgets/*.md, one test page per new widget
```

## Next

See [ROADMAP.md](ROADMAP.md). It covers what a link can't carry and why, the decisions
still open, the widgets being built for the Jev pages, and sealing, decks and short links.

## License

MIT (see [LICENSE](LICENSE)). The kit is built on html-explainer by Derek Schwede and Tiny
Little Office by Paul Ford, both MIT, and serves five fonts under the SIL Open Font License.
[NOTICE.txt](NOTICE.txt) lists what came from where, with their notices; the build puts it in
every page and in the viewer as a comment, so each copy carries its credits.
