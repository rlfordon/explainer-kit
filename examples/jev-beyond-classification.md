---
title: What Jev can do beyond classification
brand: Jev patterns
dek: Jev answers typed questions about text for $0.042 per million input tokens, in a few hundred milliseconds, and returns the full probability distribution. That price and speed support designs a chat model makes too slow or too costly: scoring every opinion in a universe instead of a sample, mapping where in an opinion an issue is decided, debugging a taxonomy from its own confusions, gating an agent at every step.
theme: field-guide
colors: cheap=#0b7285 fast=#9c5d00 dist=#5f3dc4 many=#c2255c
hero: dark
eyebrow: A builder’s atlas · jev-1.13.0 · checked 5 October 2026
meta: Patterns from Rebecca Fordon’s experiments, TypeSafe’s docs and the Jev community | Numbers are measured; untried ideas are marked
foot: Community numbers are self-reported. Demos use synthetic data or a toy scorer and are labeled as such. Jev results are uncalibrated machine assessments; fit thresholds on your own labels.
---

```waffle {total=832 cols=52 seed=832 caption="One square per opinion: 832 screened on five questions in 22.3 s for $0.074. The 23 flagged contained every known candidate. Shading illustrative."}
Category | Count | Colour
Low | rest | faint
Uncertain | 117 | accent-soft
Flagged | 23 | accent
```

## Every pattern combines the same four properties {#levers nav="Four levers"}

Jev is not a chat model: it cannot write, explain, cite or retrieve. It reads a `state` and answers named questions with probabilities. Read each pattern below as an answer to one question: which of these four properties is it exploiting?

```cards {.boxed}
Lever | Headline | What it unlocks
Nearly free {.cheap} | $0.042 / M | Input tokens; output is free. **Unlocks:** asking every document, every wording, every question you might need. 1,067 citing cases screened for $0.092.
Fast {.fast} | 0.1–0.4 s | Per request, many questions included. **Unlocks:** live feedback, per-step agent gates, control loops. 0.37 s per claim against 26–41 s for Opus.
Distributions {.dist} | p, not a label | Every option’s probability comes back. **Unlocks:** two-threshold gates, uncertainty as a signal, disagreement, features for other models.
Many at once {.many} | N questions, 2+ texts | Named questions run in parallel; state can be an array. **Unlocks:** profiles, decision trees, pairwise judgments. 13 questions over a 54k-character document in 0.27 s.
```

```glossary {.grid}
Primitive | What it returns
Choice | Picks one of up to 255 options; probabilities sum to 1, so always add `none`. Leans toward the first option.
Score | 2 to 10 ordered levels; returns a probability-weighted position. For gates, read the top level’s probability, not the expectation.
Noul | P(yes). No confidence field; 0.5 means unsure. The absolute check that a relative Choice lacks.
```

## 32 patterns, filtered by lever and by evidence {#atlas nav="Atlas"}

Each row opens to a sketch, the evidence behind it, and where it breaks. “Author-tested” means a measured run in Rebecca Fordon’s projects; “TypeSafe docs” means an official cookbook; “Community” means a public project, usually a weekend build with self-reported numbers.

```catalog {search=yes noun="patterns" empty="No pattern uses every selected lever with that evidence. Clear a filter."}
Pattern | What it does | Family:group | Lever:facet {.all .pips order="Nearly free; Fast; Distributions; Many at once"} | Evidence:facet {.multi order="Author-tested; TypeSafe docs; Community; Untried"} | Sketch:detail | Evidence:detail | Breaks when:detail {.warn}
Quick profile | Ask 10–20 questions of one document in one request and get its profile: kind, posture, who wins, whether it reaches the issue, how deep. | Get a read | [Nearly free]{.cheap}, [Many at once]{.many} | [Author-tested]{.ok} | state = one document or window; questions = a battery of Nouls and Choices; code renders a profile card. | Podcast Signal’s episode preview is in production and was right on everything checked. Four questions over 209 citing cases cost $0.0165. | Questions that need inference across a whole long document; distractor-heavy state.
Speculative fan-out | Ask every question you might need in one request; code reads only the branch it takes. The design question becomes what you would want to know, not what you can afford to ask. | Get a read | [Nearly free]{.cheap}, [Many at once]{.many} | TypeSafe docs | one request, all branches of the decision tree as named questions. | TypeSafe’s parallel-questions cookbook: 12.2× cheaper and 10× faster than one question per call. | Answers shift slightly with the other questions in the request, so version the question set.
Two-threshold funnel | Clear the confident yeses, flag the confident noes, send only the middle band to an LLM or a person. | Cut a big set down | [Nearly free]{.cheap}, [Distributions]{.dist} | [Author-tested]{.ok} | one precise Noul, plus code checks first; thresholds fitted on held-out labels. | Held out: 36 of 154 claims cleared with 0 bad; 19 flagged with 0 false accusations. 64% still went to the LLM. | A single 0.5 cutoff, or thresholds fitted in-sample. Flag recall was only 36–43%.
Census with an audit | When the universe can be listed, score all of it on one coarse question and audit a random sample for the miss rate. Completeness becomes a measured number, not a claim. | Cut a big set down | [Nearly free]{.cheap}, [Fast]{.fast} | [Untried]{.muted} | enumerate (e.g. every circuit opinion matching a broad query); one Noul each; random audit of the negatives. | Closest run: 832 opinions on five questions in 22.3 s for $0.074; the 23 flagged held every known candidate. | Only as complete as the query that listed the universe. The audit is the expensive part.
Citator-style treatment screen | Over each citing case’s citation-context window: followed, distinguished, limited, overruled? | Cut a big set down | [Nearly free]{.cheap}, [Many at once]{.many} | [Author-tested]{.ok} | state = ±1,500 characters around the citation; a treatment Choice plus a “no longer good law” Noul. | 1,067 citers of three overruled Supreme Court cases in 26.7 s for $0.092. No-longer-good-law at ≥0.5: recall 0.965, precision 0.974. Haiku’s recall was 0.83. | Overruling that must be inferred: it missed Juliana and the Ramos concurrence.
Two-stage narrowing | First request: a Choice over every option’s short description. Second: the top three with full text, and an absolute “fits?” Noul for each. | Cut a big set down | [Nearly free]{.cheap}, [Many at once]{.many} | [Community]{.warn} | request 2’s state exists only after request 1 answers; that is the only reason for a second call. | TypeSafe’s skill-suggestion cookbook over 182 skills; community skill routers for Claude Code. [Project](https://github.com/shimo4228/jev-skill-router) | One user called a personal prompt router “OK at best.”
Filter, then sort by what you have | Use Jev to drop the off-issue items, then order the survivors by a cheap signal you already hold, such as citation count. | Cut a big set down | [Nearly free]{.cheap}, [Distributions]{.dist} | [Author-tested]{.ok} | Noul on-issue at a fitted threshold; sort survivors by an existing field. | Forward-walk probe: precision in the top 30 rose from 0.50 to 0.90. | Jev’s own scores ranked worse than they filtered.
Question tree in one call | Encode a decision tree as parallel questions; code walks it. The tree doubles as the issue’s fact-pattern schema. | Taxonomies and structure | [Nearly free]{.cheap}, [Many at once]{.many} | [Author-tested]{.ok} | every node a named question; code derives composite fields from the walk. | Eleven questions over 72 opinions: 2.2 s, under a cent. Agreement with Sonnet: 74% on whether entry occurred, 70% on who initiated, 54% on entry mode. | Attributes that depend on what the excerpt window caught.
Beam search down a big taxonomy | Past 255 options, descend one Choice per level, keep the top K paths, score each path by the geometric mean of its probabilities. | Taxonomies and structure | [Nearly free]{.cheap}, [Distributions]{.dist}, [Many at once]{.many} | TypeSafe docs | candidate uses: subject headings, Key Number outlines, research-guide tagging. | Hierarchical-classification cookbook: beam K=3 got 4 of 4, greedy 2 of 4. | Opaque option keys. Always send the child’s label, not just its subtree.
Fall back to the parent | When leaf confidence is below a bar, report the parent category instead. No second call. | Taxonomies and structure | [Distributions]{.dist} | TypeSafe docs | walk the tree; stop where confidence drops under ~0.9. | TypeSafe’s classification-using-confidence cookbook. | Choice confidence depends only on the top probability and the option count; compute a margin when near-ties matter.
Taxonomy debugger | Run a draft taxonomy over a few hundred items and read the distributions: categories that keep splitting overlap, a category that never wins is dead, a high “none” rate is a gap. | Taxonomies and structure | [Nearly free]{.cheap}, [Distributions]{.dist} | [Untried]{.muted} | one Choice per item; code tallies top-two splits and win counts. See the demo in §5. | Untried. The demo in §5 uses synthetic data. | Overlap can come from vague criteria rather than a bad category. Rewrite the definitions before merging.
Fact-attribute layer | Store per-case fact attributes with their full distributions. Change one fact in the hypothetical and re-rank the corpus by attribute match: a query, not a re-read. | Taxonomies and structure | [Nearly free]{.cheap}, [Many at once]{.many} | [Untried]{.muted} | attributes table keyed to source version and passage offsets; status proposed or confirmed. | Designed in corpus-research note 09; the R5 tree is the prototype schema. | Confirming attributes is reading. Confirm only the core authorities.
Uncertainty spotlight | Spend human reading where Jev is least sure. The 0.3–0.7 band collects the contested, partial and badly worded items. | Probabilities as data | [Distributions]{.dist} | [Author-tested]{.ok} | sort by distance from 0.5, or by Choice margin, instead of by score. | Every claim at 0.95 or above was supported and none under 0.50 was; “partial” claims sat in the middle. | Out-of-distribution overconfidence can push hard items to the extremes.
Disagreement mining | Ask a broad and a narrow version of a question, or compare Jev with an LLM; read where they diverge. | Probabilities as data | [Distributions]{.dist}, [Many at once]{.many} | [Author-tested]{.ok} | two questions in the same request; code flags large gaps. | R5 follow-up: the broad-versus-narrow gap kept all 9 must-have documents. One “false alarm” (Gibbons) was Jev right and the Sonnet label too narrow. | The two questions have to measure different things.
Search over wordings | Asking is nearly free, so try many phrasings against a labeled set and keep the one that separates best. Prompt engineering with a measurable objective. | Probabilities as data | [Nearly free]{.cheap}, [Distributions]{.dist} | [Author-tested]{.ok} | a bank of candidate wordings; score each on the same labeled claims; lockbox held out. | Phrasing loop: lockbox clears went from 22 to 30 with 0 bad. At 0.50, the old wording cleared 77 with 13 bad; the new one 38 with 0 bad. | Overfitting: the nearest bad claim sat at 0.250 against a 0.255 threshold.
Gold-set hygiene | Before scoring models against gold labels, run Jev over them and re-check every label it confidently contradicts. | Probabilities as data | [Nearly free]{.cheap}, [Distributions]{.dist} | [Untried]{.muted} | Noul per item against the label’s definition; review where \|p − label\| > 0.8. | Suggested by the Gibbons case, where Jev beat the reference label. | Jev only nominates labels for review; it never overwrites them.
Answers as features | An LLM proposes questions, Jev answers them for every row, and a classical model trains on the probabilities. | Probabilities as data | [Nearly free]{.cheap}, [Many at once]{.many} | TypeSafe docs | Score → mean and SD features; Noul → one probability feature. | Feature-discovery cookbook: CatBoost on Jev features reached RMSE 1.77, against 2.15 when Jev predicted the target directly. | Seven “independent” questions can measure one thing: in one grading run they all scored AUC 0.41–0.55.
Policy over cached probabilities | Store full answers once. Thresholds and weights live in code, so a new policy re-routes everything with no new call. | Probabilities as data | [Nearly free]{.cheap}, [Distributions]{.dist} | TypeSafe docs | cache on (state, questions, model); policies are threshold dictionaries. | Guardrails cookbook: strict and permissive policies over the same cached answers. | A new model version invalidates the cache. Pin and log the version.
Locator | One Choice over numbered passages: which one decides X? Jev cannot quote, but it can pick. | Making it point | [Many at once]{.many} | [Author-tested]{.ok} | split the opinion into ≤250 passages; keys are passage IDs; add none. | Right passage first 77%, top three 92%, top five 96%. Top five plus neighbours is 27% of the opinion. | 255-option cap; long opinions need splitting.
Paragraph heat map | The same Noul over every paragraph draws a probability curve through the document: where the issue is decided, where it is only mentioned. | Making it point | [Nearly free]{.cheap}, [Fast]{.fast}, [Distributions]{.dist} | [Untried]{.muted} | one request per paragraph, or several paragraphs as a state array. See §4. | Untried as a map. Try the demo in §4. | Absolute per-passage questions can sit at chance; prefer concrete Nouls or a relative Choice.
Remove-a-sentence attribution | Delete one sentence at a time and re-ask. The sentences whose removal moves the answer most are what drove it: explanation for a model that cannot explain. | Making it point | [Nearly free]{.cheap}, [Fast]{.fast} | [Untried]{.muted} | N+1 requests per passage; rank sentences by \|Δp\|. | Untried. Try it in §4. | Redundant evidence hides: removing one of two supporting sentences moves nothing.
Select, don’t generate | A regex or parser proposes candidate values; each becomes a Choice key; Jev picks; code copies the exact string. It cannot invent a value or transpose a digit. | Making it point | [Many at once]{.many} | TypeSafe docs | candidates as keys plus none; dates as seven part-Choices with calendar math in code. | Value-extraction and function-calling cookbooks (54 questions in one request). | It cannot pick a value you left out.
Pairwise judgment | Put both sides in one state: claim and passage, query and candidate, version A and version B. Ask: same issue? supports? changed meaning? | Two texts at once | [Many at once]{.many} | [Author-tested]{.ok} | state = {a, b}; several questions per pair. | The citation gate is pairwise (proposition + passage). Rerank cookbook on legal queries: top-10 hit rate from 38% to 62%, 1,200 calls for $0.0645. | Generic record dedupe was “underwhelming” in one field report.
Tournament ranking | Many cheap “which is more on point?” comparisons add up to a ranking that sidesteps weak absolute calibration. | Two texts at once | [Nearly free]{.cheap}, [Many at once]{.many} | [Untried]{.muted} | Choice of A or B per pair; aggregate with Elo or Bradley–Terry in code. | Untried. | Choice leans toward the first option; ask both orders.
Check, then escalate | A Noul battery checks each claim or field of an LLM’s output; any flag over a bar escalates to a stronger model. Combine flags with max, not mean. | Watching processes | [Nearly free]{.cheap}, [Distributions]{.dist} | [Author-tested]{.ok} | per-field questions such as field::hallucinated; escalate if any P(wrong) > 0.7. | A holistic “is this good?” judge gave 0.56 where per-field checks gave 0.95 and 0.85. The citation checker caught a real wrong cite: 133 N.J. 347, not 247. | Vague “anything left out?” questions scored 0.78–0.90 on everything.
Agent tripwires | Inside a long agent run, ask at each step: still on task? does this draft answer the question? is the work actually done? The answer gates a hook. | Watching processes | [Nearly free]{.cheap}, [Fast]{.fast} | [Community]{.warn} | hook fires per turn; state = task plus latest output; Noul gate. | JevFlow asks Jev whether a phase is really done before Claude may stop; agent-chaperone screens tool calls and results. [Project](https://github.com/Parth1811/JevFlow) | Not a security boundary: injected text in the state is not treated as hostile.
Keep or drop context | Instead of summarizing an agent’s context, ask per item: keep, drop or lease? And how much effort does the next step need? | Watching processes | [Nearly free]{.cheap}, [Fast]{.fast} | [Community]{.warn} | Choice per context item; code assembles the next prompt. | A community shape in the prior-art catalog. | Untested on research sessions.
Novelty detector | For each new authority: does it add a fact posture not already in the set? Plot new postures per round; stop when the curve flattens. | Watching processes | [Nearly free]{.cheap}, [Many at once]{.many} | [Untried]{.muted} | pairwise against the set’s posture summaries, or via the attribute layer. | Proposed as a third saturation curve in corpus-research note 09. | Needs the fact-attribute layer first.
Feedback as you type | Re-ask on every pause: flag a holding stated without a cite, check a student’s issue statement against a rubric, badge each case in a reader. | Live and in the loop | [Fast]{.fast} | [Untried]{.muted} | debounced request per edit; commit when the answer is stable across increments. | A community shape: re-ask on every increment, commit at a confidence bar. | Partial input looks like a different input; require stability before showing a flag.
Control loop | State in, Choice over the legal actions out, code executes, repeat every tick. | Live and in the loop | [Fast]{.fast}, [Many at once]{.many} | [Community]{.warn} | keys = the actions allowed right now; code enforces rules. | Community projects drive a browser and play Pokémon Red this way. [Project](https://github.com/milanboers/jev-plays-pokemon) | Search-like tasks fail: it blundered on every chess move.
Misconception tagging | Map a student answer onto a taxonomy of known errors, then pick the targeted hint or tally misconceptions across a class. | Live and in the loop | [Nearly free]{.cheap}, [Many at once]{.many} | [Untried]{.muted} | Choice over the error taxonomy plus none; a Noul for “correct.” | Untried. | The error taxonomy needs the debugger treatment first.
Feed triage | New reports, opinions or episodes: is this in my interests, and which project does it belong to? Decide before anything downloads or transcribes. | Live and in the loop | [Nearly free]{.cheap} | [Author-tested]{.ok} | absolute interest Noul plus a project Choice with none. | Podcast Signal preview in production. Untried for CRS reports and opinion alerts. | A title alone carries little evidence.
```

## Jev is reliable at the ends and mushy in the middle {#funnel nav="Funnel"}

[Distributions]{.dist} [Nearly free]{.cheap}

In the citation-checker runs, every claim scored 0.95 or above was supported and none under 0.50 was, while “partially supported” claims spread across the middle. So the useful design has two thresholds: clear above one, flag below the other, and send the band between them on. Move the thresholds and watch what slips through. Then switch to a vaguer question.

```triage {title="Two-threshold funnel" hint="Move the thresholds · switch the wording" .rows .fade-mid lo=0.13 hi=0.90 lo-range="0.01 0.49" hi-range="0.5 0.99" lo-incl=yes lo-label="Flag at or below" hi-label="Clear at or above" scenario="Question wording" axis="Probability the claim is fully supported"}
class supported: supported | ok good
class partial: partial | warn
class unsupported: unsupported | bad
supported: .942 .8123 .7576 .9232 .5817 .93 .7324 .6569 .8927 .9049 .8935 .8513 .8504 .8896 .7456 .8824 .8543 .8287 .9526 .6736 .7787 .771 .8083 .8931 .8347 .6706 .8806 .9598 .7376 .9127 .7439 .7943 .7725 .7573 .8806 .699 .9173 .8078 .9395 .609 .6909 .8394 .9334 .8355 .915 .8842 .9281 .9262 .8896 .9346 .7255 .9225 .8897 .5806 .7225 .9523 .9595 .9185 .8352 .9546 .903 .9164 .6539 .9633 .9603 .7835 .9659 .8045 .9533 .9551 .6878 .7532 .8027 .7726 .8288 .9336 .8335 .7891 .8776 .9416 .9019 .8301 .5966 .9321 .874 .9623 .8423 .8832 .9105 .8854
partial: .4893 .445 .5288 .2663 .4909 .4291 .4233 .3841 .3215 .5035 .3875 .7329 .5878 .3994 .5048 .2506 .2886 .3275 .351 .1507 .5478 .4167 .4121 .3172 .1992 .5173 .6289 .2029 .3576 .108 .2548 .97 .5094
unsupported: .0501 .3355 .2198 .1103 .1114 .3287 .2468 .157 .2407 .1559 .1197 .1194 .1553 .1282 .1455 .0549 .0809 .1221 .228 .1063 .176 .1372 .1769 .2674 .2125 .161 .6498
scenario “Fully supported as written?”: p
scenario “Does the opinion support it?”: clamp(class == "supported" ? p + 0.01 : class == "partial" ? p + 0.3 : p + 0.12, 0.01, 0.99)
zone low: Flag | flagged as likely wrong
zone mid: Send on | sent to the LLM
zone high: Clear | cleared without an LLM
say if highBad > 0 && lowGood == 0: **{highBad} partial or unsupported claim{highBad > 1 ? "s" : ""} cleared without review.** Outlined dots are the errors.
say if highBad == 0 && lowGood > 0: **{lowGood} supported claim{lowGood > 1 ? "s" : ""} falsely flagged.** Outlined dots are the errors.
say if highBad > 0 && lowGood > 0: **{highBad} partial or unsupported claim{highBad > 1 ? "s" : ""} cleared without review; {lowGood} supported claim{lowGood > 1 ? "s" : ""} falsely flagged.** Outlined dots are the errors.
say if highBad + lowGood == 0: No bad clears and no false flags. {mid/total | percent} of claims still need the LLM: the savings come only from the ends.
```

150 synthetic claims shaped like the real runs. Real result: the vaguer gate wording at 0.50 cleared 77 claims with 13 bad; the precise wording cleared 38 with 0 bad. {.note}

## Jev cannot cite, but it can point at what you number {#heatmap nav="Heat map"}

[Many at once]{.many} [Nearly free]{.cheap} [Fast]{.fast}

Ask the same question of every paragraph and the answers form a map of the opinion. A Noul per paragraph gives absolute heat, which blurs “mentions the issue” into “decides it.” A Choice across all paragraphs gives a relative locator, which is sharper. Click any sentence to delete it and re-ask: the sentences whose removal moves the answer are what drove it.

```locator {title="Locator, heat map, attribution" hint="Pick a question · click a sentence to remove it" temp=2.5 relative="Choice across paragraphs" absolute="Noul per paragraph" note="Fictional opinion; a keyword toy stands in for Jev, so the values are illustrative. Real results: the citation locator put the right passage first 77% of the time and in the top three 92%. An absolute per-passage “is this substantive?” Noul in Podcast Signal did no better than chance."}
question: Where does the court decide whether the clothing exception requires a request? | we hold 3, clothing exception 1.5, request 1.2, reasonably necessary 1.5, does not require 1.5, argues -1, generally -0.3 | bias 2.5 | none 2
question: Where does the opinion say who initiated the entry? | did not ask 3, without asking 2.5, went inside 1.5, request 0.8, officer 0.3 | bias 2.5 | none 2
question: Where does the court state the standard of review? | de novo 2.5, clear error 2.5, review 1.2 | bias 2.5 | none 2
passage Facts: Officers arrested Dana Price on her front porch on an outstanding warrant. | She was barefoot and wearing a nightgown, and it was 18 degrees outside.
passage Facts: Price did not ask to retrieve clothing. | Without asking her, an officer went inside to get shoes and a coat. | In the bedroom he saw a scale and baggies on the dresser.
passage Procedure: Price moved to suppress the items. | The trial court denied the motion and Price appeals.
passage Standard: We review legal conclusions de novo and findings of fact for clear error.
passage Arguments: Price argues that the clothing exception requires a request from the arrestee. | The State answers that the exception rests on the officers’ duty of care, not on consent.
passage Analysis: Courts recognizing the clothing exception have generally tied it to a request or to genuine need. | Where an arrestee is partly dressed in severe cold, the need is plain.
passage Holding: We hold that the clothing exception does not require a request when exposure makes clothing reasonably necessary. | The entry here was limited to retrieving shoes and a coat.
passage Plain view: Because the officer was lawfully in the bedroom, the scale and baggies were in plain view.
passage Disposition: Affirmed.
```

## A taxonomy’s confusions show up in the distributions {#taxonomy nav="Taxonomy"}

[Distributions]{.dist} [Nearly free]{.cheap}

Run a draft label set over a sample and, instead of reading the winners, read where the probability splits. Two categories that keep sharing the top two places overlap; a category that almost never wins is dead weight. Below is a draft treatment taxonomy for citing cases, run over 80 synthetic citers. Widen the margin to count closer calls, then apply the fixes the matrix suggests.

```splits {title="Taxonomy debugger" hint="Move the margin · apply a fix" margin=0.2 margin-range="0.05 0.5" seed=7 escape=None note="Synthetic distributions built to show the method. Untried on real data; the closest real result is the R5 tree, where entry mode agreed with Sonnet only 53.5% of the time."}
categories: Follows, Applies, Distinguishes, Limits, Criticizes, Overrules, Mentions, None
28: Follows 0.3+0.3, Applies 0.25+0.3 / Applies 0.3+0.3, Follows 0.25+0.3
14: Distinguishes 0.5+0.3, Limits 0.1+0.25
8: Limits 0.35+0.2, Distinguishes 0.25+0.25
5: Limits 0.35+0.15, Criticizes 0.25+0.15
5: Overrules 0.8+0.15
14: Mentions 0.5+0.3, None 0.1+0.2
6: None 0.55+0.3, Mentions 0.1+0.2
fix Merge Follows + Applies: Follows, Applies -> Relies on
fix Fold Criticizes into Limits: Criticizes -> Limits
```

## Failure modes, with the fix that worked {#limits nav="Where it breaks"}

| Failure | What happened | What worked |
| --- | --- | --- |
**Literal reading** | A one-of-N Choice picked “plaintiff” when the true answer was “both” (district-court probe). TypeSafe lists indirection and double negatives as weak spots. | Ask the decision as one plain yes/no; write the boundaries into the criteria.
**Your facts in the question** | A generic on-issue question with the researcher’s facts embedded scored anchor cases 0.03–0.25. | A neutral doctrinal question separated 0.90 from 0.15.
**Long, noisy state** | TypeSafe calls it context rot. In CaseCloud, 60 of 117 documents hit the 9,000-character window cap, which became the ceiling. | Send located passages or citation-context windows, not whole opinions.
**Calibration off its home turf** | A fair die came up 1 about 83% of the time; contested items read overconfident. On unseen legal material, Choice and Score ran overconfident and Noul underconfident. | Fit thresholds per question on your own labels; never use the vendor’s bands as-is.
**Fabrication blindness** | A fabricated quote scored 0.99 “supported,” because the proposition itself was true. | Run quote, citation and pincite checks in code before Jev sees the claim.
**Arithmetic, dates, counts** | On TypeSafe’s own jaggedness list for 1.13. | Do them in code; ask Jev only for the parts, as in the date cookbook.
**Choice order** | Leans toward the first option. | Shuffle or ask in both orders when it matters.
**Vague questions** | “Did the summary leave anything out?” scored 0.78–0.90 on every claim. | Atomic questions, combined in code with max for flags.
**Hard reasoning as the final word** | Chess, and code review as the only reviewer, both failed in the field. | Use Jev for triage and gates; keep the decision with an LLM or a person.
**Speed and cost hype** | Field measurements put it 5–7× faster than small LLMs, not 200×. Batched offline LLM prompts can match its cost. A Jev locator feeding Opus saved at best 36%; the Batches API saves 50%. | Price the best case before building.

## What this page rests on {#sources .sources nav="Sources"}

1. TypeSafe docs: [models and pricing](https://docs.typesafe.ai/models.md), [primitives](https://docs.typesafe.ai/primitives.md), [state](https://docs.typesafe.ai/concepts/state.md), [jaggedness, jev-1.13](https://docs.typesafe.ai/model-jaggedness/jev-1.13.md), [patterns and cookbook index](https://docs.typesafe.ai/llms.txt).
2. TypeSafe cookbooks: [rerank](https://docs.typesafe.ai/cookbooks/rerank_typesafe.md), [hierarchical classification](https://docs.typesafe.ai/cookbooks/hierarchical_classification.md), [cascade](https://docs.typesafe.ai/cookbooks/sde_cascade.md), [guardrails](https://docs.typesafe.ai/cookbooks/llm_guardrails.md), [feature discovery](https://docs.typesafe.ai/cookbooks/autoresearch_feature_discovery.md), [function calling](https://docs.typesafe.ai/cookbooks/function_calling.md), [value extraction](https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook.md), [semantic find](https://docs.typesafe.ai/cookbooks/semantic_find.md).
3. [OpenRouter, “Jev vs LLM: when to use each”](https://openrouter.ai/blog/tutorials/jev-vs-llm-when-to-use-each/) (latency benchmark, Sept. 2026).
4. [aaddrick/building-with-typesafe-jev](https://github.com/aaddrick/building-with-typesafe-jev): prior-art index of community projects and field failures, snapshot 25 Sept. 2026.
5. [JyothiKumar03/just-jev-it](https://github.com/JyothiKumar03/just-jev-it): fit heuristics.
6. Community projects: [JevFlow](https://github.com/Parth1811/JevFlow), [agent-chaperone](https://github.com/agent-chaperone/agent-chaperone), [jev-skill-router](https://github.com/shimo4228/jev-skill-router), [jev-agent-hooks](https://github.com/onlyjq04/jev-agent-hooks), [jev-plays-pokemon](https://github.com/milanboers/jev-plays-pokemon), [jev-browser-skill](https://github.com/zurfyx/jev-browser-skill), [jevgate](https://github.com/Tech-Byte-Frontier/jevgate).
7. Calibration on contested items: [zenodo.org/records/22971492](https://zenodo.org/records/22971492).
8. Rebecca Fordon’s experiments, 16 Sept.–5 Oct. 2026 (unpublished): citation-verifier Jev retrospectives (19 and 22 Sept.), us-legal-research Jev probes (forward walk, treatment screen, district triage), corpus-research R5 screen and research notes 08–09, Podcast Signal Jev spike.
