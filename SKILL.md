---
name: explainer-kit
description: Build an interactive explainer page, or a shareable link to one (not encrypted, so whoever holds it can read it), from a short Markdown source with reusable widgets (timeline, router, stepper, decision tree, quiz, checklist, cards, stats, myths, glossary). Use when someone wants an explainer, client-facing summary, or one-pager they can send as a link without hosting it, or wants explainers built from shared parts rather than bespoke HTML. For a fully bespoke, design-led public explainer, html-explainer's own process still applies; this kit is its modular sibling.
---

# explainer-kit (draft)

You write `page.md` in the kit's format, not HTML. The build produces the page (or link),
so your effort goes into the content, the structure, and choosing and filling the right
widgets. Read `README.md` for the full format before writing; each widget's grammar is in
the opening comment of `widgets/<name>.js`.

## 1. Scope (ask only what you cannot infer)

- **File or link?** A link (sent to a client, nothing hosted, readable by anyone holding it) allows only the
  trusted widgets. A file may also carry a bespoke `demo` fence. This decides how ambitious
  the centrepiece can be.
- **Who reads it, and what should they be able to decide or do afterwards?**
- **Sources**: ground every claim in the user's material or primary sources; cite them in a
  `## Sources {.sources}` section.

## 2. Architecture

Follow html-explainer's learning architecture (its SKILL.md, Phase 1): one mental model
first, then depth; each section a single idea; an eyebrow label (`nav="…"`) and a
headline that states the point, not the topic. Pick widgets for what the reader must *do*:

| The reader needs to… | Use |
|---|---|
| see what happened when, or what is coming | `timeline` (with `today=` for case chronologies) |
| find their own situation in a set of rules | `router` (every combination gets a row) |
| choose a route by answering questions | `tree` |
| follow a process or a scenario stage by stage | `stepper` |
| compare options side by side | a `{.compare}` table |
| unlearn something | `myths` |
| act | `checklist` |
| work out a number from their own inputs (fees, costs, deadlines) | `calc` |
| see a share or a comparison of amounts | `bars`, `waffle` |
| see how thresholds trade errors against workload | `triage` |
| browse or filter a set of options, cases or ideas | `catalog` |
| check understanding | `quiz` (public explainers; rarely client pages) |

At least two interactive widgets on a public explainer; on a client page, only what earns
its place. Keep a client link under ~8,000 characters (`--check` reports it) so it survives
chat apps; under 2,900 if it must fit a QR code.

## 3. Design

Set the look in the front matter: `theme:` (`brief`, `counsel`, `field-guide`, `night`; see
README), optionally `accent`, and `colors:` for the topic's
own entities (agencies, parties, options) — use those colours only for those entities, through
`[Name]{.name}` chips, table headers and timeline kinds. A public explainer should also get a
distinctive hero and, in a file, a bespoke centrepiece (`demo`, `html` + `style`). Client pages
should look like the firm: the same palette every time is a feature.

## 4. Build, check, look, revise

```sh
node build.mjs page.md --check          # fix every warning
node build.mjs page.md                  # the file
node build.mjs page.md --link --viewer <hosted viewer URL>   # the link
node test/check.mjs page.html --link "<link>" --shots shots/  # must pass
```

Then open the screenshots (desktop and phone) and look at them as a reader would: overflow,
crowded timelines, verdicts that read badly, sections that say nothing. Revise the source and
rebuild. `check.mjs` passing is necessary, not sufficient.

## Rules

- Never put HTML in prose; use the format's marks and spans. Raw HTML belongs only in `html`
  and `demo` fences, and only for a file.
- A link is the document: anyone holding it can read it. Until sealing ships, do not put
  anything in a link that could not be emailed in plain text. Keep notes and drafts out of
  the source: the build leaves out front matter and raw fences the page does not show, and
  says so, but anything else in the source travels in the link.
- Links are signed with the user's own key (`~/.explainer-kit/signing-key.json`), and the
  hosted viewer opens nothing else. If `--link` says the key is missing, stop and tell the
  user. Never make a new key or edit `kit.json` "keys" to get around it, because that changes
  whose pages their viewer trusts.
- Dates in a timeline are `YYYY-MM-DD` or a year, in order.
