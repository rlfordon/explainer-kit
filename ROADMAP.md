# Roadmap

Where the kit is going, and the design rules that decide what can go in a link. The README
describes what exists today.

## The rule a link lives by

A link is data, never code. It carries the page's text and settings, and the viewer draws
them with widgets already built into it, escaping every string. Two guarantees follow, and
both are tested:

1. **Nothing from the link runs.** The viewer lives at Rebecca's own address
   (`rlfordon.github.io/explainer/`). If it ran code from links, anyone could write a link
   that runs their code under her name: a fake login form, or a page that sends what a
   reader types somewhere else. Tiny Little Office made the same call for the same reason.
2. **Nothing leaves the browser.** The viewer's Content Security Policy lets the page load
   only its own script and its own fonts. That is what lets a client page say "nothing in
   this page was sent anywhere," and mean it.

Signing (done, October 2026) adds a third: the viewer opens only links signed by a key on
its list, so a stranger cannot use the viewer's address at all. See the README's *Signing*.

## What a link cannot carry, and why

| In html-explainer | Why a link can't carry it | The file target |
|---|---|---|
| Bespoke demos: canvas simulations, sound, animation, mechanism demos (the Gutenberg press) | Each is a program, and guarantee 1 forbids running one. Also large: the custom code in Rebecca's pages alone runs 7,000–22,000 characters of link. | Yes, through a `demo` fence |
| Custom diagrams (SVG) and images | SVG can carry scripts and outside references, so the viewer strips it. An outside image tells its server the page was opened (guarantee 2); an embedded one makes the link enormous. | Yes, through `html` |
| "Go bold" art direction | Page CSS can hide parts of the page or draw a fake "Signed by" line over the real one. A link gets only the vetted choices: theme, accent, topic colours, approved fonts. | Yes, through `style` |
| The chat dock | The kit's own code, so guarantee 1 allows it. Guarantee 2 does not: chatting sends the page and the questions to an AI provider. | Yes, `--chat` |

The **Review & edit overlay** is not blocked by either guarantee. It is not built into the
viewer yet, and in a link its "Download edits" should produce a new link, not an HTML file.

## Decisions waiting on Rebecca

- **Custom demos in signed links?** Signing opens a middle path: a signed link could carry
  a custom demo, run in a sealed-off frame (a sandboxed iframe: an opaque origin, so it can't
  touch the site, under its own policy forbidding any network request). The costs: a leaked
  key would run code under her address instead of only showing text (contained by the frame,
  ended by revoking the key); links get much longer (email-length, not text-length); and the
  viewer gets harder to secure and test. Worth it only if client pages need demos that
  trusted widgets can't express.
- **An opt-in chat in links?** A button where the reader enters their own key, with a plain
  notice that the page and questions go to the provider. It breaks guarantee 2 by the
  reader's choice, so the "nothing was sent" footer would need to change while it is on.
- **A short-link service storing only ciphertext?** Needed for SMS and QR, and it is also the
  only way to make one link expire or be revoked on its own (signing revokes a whole key).

## Trusted widgets: closing the gap without running link code

A widget is code that ships inside the viewer, so it can do anything a demo can as long as
the page supplies only data. Where a demo needs a formula, the formula is written in a small
expression language (`lib/expr.js`): numbers, arithmetic, comparisons, a fixed list of maths
functions and the page's own named values. It has no loops and no way to reach anything
outside, so a hostile formula can produce a wrong number and nothing else.

### For the Jev pages (in progress, October 2026)

What `jev-legal-research.html` and `jev-beyond-classification.html` use, mapped to widgets:

| Widget | Replaces | What it does |
|---|---|---|
| `bars` | the probability bars, the LegalBench stacked bar, the citator-error bars | Horizontal bars or one stacked bar, from a Label · Value table |
| `waffle` | the 832-opinion census grid | One square per item, coloured by category, scattered or in order |
| `catalog` | §3 "Eleven things to try", the 32-pattern atlas | Filter chips (single or multi-select), search, grouping; rows that expand or a list with a detail panel |
| `calc` | the corpus cost calculator | Sliders (linear or log), choices and presets feeding formulas; formatted results, a meter, sentences that change with the numbers |
| `triage` | both two-threshold demos | Scored items as dots on a 0–1 axis; two thresholds split them into three zones; counts, errors, and a scenario switch (calibration, question wording) that rescales the scores |
| `locator` | the heat map with remove-a-sentence | Passages scored against a question (relative or absolute); click a sentence to remove it and see what moves |
| `splits` | the taxonomy debugger | Category distributions per item; a split-count matrix, win counts, a margin slider and merge buttons |

### Later

- **Interactive diagrams** from fixed layouts (pyramid, flow, grid) where clicking a node
  shows its detail. Covers the fbi page's four-agency diagram.
- **Strip plot** on a shared axis for "where does each item fall" (`triage` without
  thresholds may cover it).
- **Citation drawer**: a shared slide-in panel with the source text and a link.
- **Tabs**, a **before/after toggle**, and **predict-then-reveal / fill-in** questions.

## Formats

- **Deck mode** (`shape: deck`), from html-explainer's fair-use deck engine: one idea per
  slide, keyboard and swipe, progress, deep links.
- **Chaptered scroll** (the hybrid): scroll-snap between chapters.

## Links

- **Seal**: encrypt the payload (AES-GCM, a generated password sent separately), following
  Tiny Little Office's sealed form, so a client page is ciphertext in every mailbox. The
  signature goes over the sealed payload, so the viewer can refuse a forged link before
  asking for a password.
- **Short links** (see the decision above).

## Authoring

- **A Claude skill** that writes `page.md` instead of raw HTML (draft in `SKILL.md`).
- **Review & edit in the viewer**, producing a new link.
