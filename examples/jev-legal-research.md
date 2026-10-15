---
title: What Jev could do for legal research and citation analysis
dek: Jev is a model from TypeSafe AI that writes nothing. It reads text, answers closed questions, and attaches a probability to each answer. Citator labels, cite-checks, and docket coding are closed questions. Here are eleven things worth trying, what supports each, and where the approach has already failed.
brand: Jev and legal research
theme: brief
fonts: Source Serif 4 / IBM Plex Sans / IBM Plex Mono
accent: #1d4f91
colors: law=#2c6a4f elsewhere=#1d4f91 untried=#7c8796
meta: Field guide · September 2026 | Checked against the linked sources on September 19, 2026 | Model version at the time: jev-1.13.0
foot: This page is educational and is not legal advice. The ideas in §3 and the pipeline in §7 are proposals, not tested products. Research and drafting assisted by Claude; every figure links to the page it came from.
---

One decision, illustrated {.kicker}

> "We decline to extend *Doe* beyond its facts. Unlike the plaintiff there, ..."

```bars {title="How does the passage treat the cited case?" .peak .compact max=1 caption="0.81 clears a 0.80 threshold, so the label is recorded. Below it, a person reads the passage."}
Treatment | Probability
follows | 0.03
distinguishes | 0.81
criticizes | 0.10
overrules | 0.01
unclear | 0.05
```

```stats {.big-first}
Label | Value
answer types: Choice, Score, and Noul (a yes-probability)[[4](#s4)]{.c} | 3
ceiling for the text you send plus the longest question[[3](#s3)]{.c} | 32k tokens
per million input tokens; output is free[[3](#s3)]{.c} | $0.042
projects in the awesome-jev list is about law[[1](#s1)]{.c} | 1 of 212
```

## Text in, typed answers out {#how nav="How it works" cols="1 1"}

A request has two parts. The `state` is whatever text you want judged: a passage, a docket entry, a JSON record. The `questions` are closed, and each declares its type. Every question in one request is answered in a single pass over the state, so ten questions take about as long as one.[[4](#s4)]{.c}[[14](#s14)]{.c}

Think of Jev as a research assistant who fills in a coding sheet and never writes the memo. It cannot quote, explain, or search. Each answer comes back as a number your own code compares against a threshold, and the threshold decides whether a person looks.

```glossary
Type | What it returns
`choice` | Picks one option from a list you define, and returns the probability of every option plus a confidence. *Which treatment label fits this citing passage?*
`score` | Places the text on ordered levels you define, as a probability-weighted position. *Bare citation, a sentence or two, or extended discussion?*
`noul` | Returns the probability that a yes/no statement is true. There is no separate confidence field, and you turn it into a boolean yourself.[[4](#s4)]{.c} *Does this passage support the proposition it is cited for?*
```

|

Request {.kicker}

```json
POST /v1/systemone
{ "model": "jev-1.13.0",
  "state": {
    "cited_case": "Doe v. Roe (hypothetical)",
    "citing_passage": "We decline to extend Doe beyond
      its facts. Unlike the plaintiff there, ..." },
  "questions": {
    "treatment": { "type": "choice",
      "instructions": "How does the passage treat the cited case?",
      "criteria": {
        "follows": "Applies its rule",
        "distinguishes": "Finds it inapplicable on facts or issue",
        "criticizes": "Disagrees but does not overrule",
        "overrules": "Declares it no longer good law",
        "unclear": "The passage does not show the treatment" } },
    "negative": { "type": "noul",
      "instructions": "Does the passage limit the
        cited case's authority?" } } }
```

Response {.kicker}

```json
{ "answers": {
    "treatment": { "choice": "distinguishes",
      "probabilities": { "follows": 0.03, "distinguishes": 0.81,
        "criticizes": 0.10, "overrules": 0.01, "unclear": 0.05 },
      "confidence": 0.78 },
    "negative": { "noul": 0.88 } } }
```

Illustrative values. The field names follow TypeSafe's API reference.[[4](#s4)]{.c} {.note}

---

```stats {.big-first}
Label | Value
TypeSafe's stated latency range[[2](#s2)]{.c} | 70–500 ms
measured by an outside tester on 24 documents; slowest 1.3 s[[5](#s5)]{.c} | 0.32 s median
documents in that same test[[5](#s5)]{.c} | $0.22 per 1,000
and 250,000 tokens per second, subject to change[[3](#s3)]{.c} | 1,200 requests/min
```

## Legal research already runs on closed label sets {#fit nav="Why law fits"}

A citator signal, a Bluebook signal, and a docket event code are each a choice from a fixed list. The published benchmarks for legal AI are mostly the same shape, and the commercial products that assign these labels by hand disagree with each other more than most users assume.

---

```bars {title="147 of LegalBench's 162 tasks are yes/no or multiple choice" .stack caption="Tasks include hearsay, overruling, and 16 issue-spotting sets. CaseHOLD adds 53,137 five-option questions on picking the right holding."}
Format | Tasks
Binary | 112
Multiple choice | 35
Multi-class | 8
Open generation | 7 {.muted}
```

Sources: LegalBench[[24](#s24)]{.c}, CaseHOLD[[25](#s25)]{.c}. {.note}

|

```bars {title="Share of 309 clearly negative citing relationships each citator failed to identify correctly" caption="Hellyer's 2018 study of 357 citing relationships. All three citators agreed on the type of negative treatment in 40 of them, or 11%."}
Citator | Missed
Shepard's | 33%
KeyCite | 38%
BCite | 72%
```

Source: Hellyer[[19](#s19)]{.c}. {.note}

---

```glossary
Label set | Labels
Citator treatment phrases | followed by · distinguished by · criticized by · questioned by · limited · overruled by · superseded by statute
Bluebook Rule 1.2 signals[[27](#s27)]{.c} | [no signal] · e.g. · accord · see · see also · cf. · compare … with · contra · but see · but cf. · see generally
SCALES docket events[[26](#s26)]{.c} | complaint · removal · motion · order · judgment · verdict · sentence … about 27 events, 70+ labels in all
```

The Stanford study of commercial legal AI tools gave one failure a name. A **misgrounded** answer cites a real source that does not support the claim, and the authors call it harder to spot than an invented case. Lexis+ AI answered 65% of their 202 queries accurately and Westlaw AI-Assisted Research 42%.[[22](#s22)]{.c} Whether a cited passage supports a proposition is a yes/no question about two pieces of text.

## Eleven things to try {#ideas nav="Ideas"}

Only one of these has been built with Jev for law. Five borrow a pattern someone built with Jev in another field, and the rest are untested. Pick one to see the question you would ask, what supports the idea, and the main way it could go wrong.

```catalog {.split noun="ideas" empty="No idea matches both filters. Clear a filter to see one."}
Idea | What it is | Answer type:facet {order="Choice; Score; Noul"} | Evidence:facet {.dot order="Built for law; Built elsewhere; Not built"} | The question:code | What supports it:detail | Main risk:detail {.warn}
Classify how a citing opinion treats a case | For every passage that cites a case, label the treatment. This is the core judgment inside a citator. | Choice, Noul | [Not built]{.untried} | choice: "How does the passage treat the cited case?"\n  follows \| distinguishes \| criticizes \| overrules \| unclear\nnoul:   "Does the passage limit the cited case's authority?" | The commercial citators missed or mislabeled 33% to 72% of clearly negative treatments in Hellyer's sample and agreed on the type 11% of the time[[19](#s19)]{.c}. Free Law Project is building an open citator for CourtListener, starting with Supreme Court overrulings[[20](#s20)]{.c}. General language models reached 79.1% on coarse labels and 67.7% on fine-grained ones across 239 expert-annotated citations[[21](#s21)]{.c}. Chandler names this as a use[[18](#s18)]{.c}. | Keep the option list short and include an escape option. A 12-way Choice collapsed in testing[[8](#s8)]{.c}. Free Law Project's own scheme has "ambiguous" and "unverifiable" categories, so some share of passages has no right answer.
Check that a source supports the proposition | For each sentence and the passage it cites, decide whether the passage supports it. This targets the misgrounded citation. | Choice | [Built elsewhere]{.elsewhere} | choice: "A brief cites a case for `sentence`. `passage` is text from that case.\n  How does `passage` relate to the claim made in `sentence`?"\n  supports \| contradicts \| says_nothing | citation-verifier does this for academic papers with nearly this wording. Claude finds the quote, code confirms the quote is verbatim in the source, Jev scores the relation, and rows under 0.8 go to a person[[16](#s16)]{.c}. The Stanford study defines misgrounded answers and calls them harder to spot than fabricated cases[[22](#s22)]{.c}. | The citation-verifier's author states that its thresholds have not been validated on labeled data[[16](#s16)]{.c}. Legal support often turns on an inferential step, which is the difference between no signal and "see."
Audit Bluebook signals | Given a proposition and the cited passage, pick the signal that fits, then compare it with the signal the author used. | Choice | [Not built]{.untried} | choice 1: "What is the relation between the text and the source?"\n  support \| comparison \| contradiction \| background\nchoice 2 (if support): states_it_directly \| supports_with_inferential_step \| supports_by_analogy | Rule 1.2 defines each signal by the relation it asserts: no signal when the source directly states the proposition, "see" when there is an inferential step, "cf." for support by analogy, "contra" for direct contradiction[[27](#s27)]{.c}. That is a typed relation with an ordering by strength. | Eleven signals exceed the reported 10-option cap and the tested limit for long lists, so the question has to be split in two[[8](#s8)]{.c}[[29](#s29)]{.c}. Untested.
Sweep a corpus for overruling language | Ask one yes/no question of every sentence that mentions another case: does this sentence say a case is overruled? | Noul | [Not built]{.untried} | noul: "Does this sentence state that an earlier decision is overruled,\n  abrogated, or no longer good law?" | The Overruling dataset is 2,400 sentences with attorney-annotated positives, and the paper reports F1 of 0.958 to 0.974 on it[[25](#s25)]{.c}. Free Law Project's first citator phase targets exactly this label[[20](#s20)]{.c}. A ready benchmark exists, so this is the cheapest idea to evaluate honestly. | In Hellyer's sample the citators mislabeled one to three of four Supreme Court overrulings[[19](#s19)]{.c}. The hard cases are implicit: "overruling recognized by" and statutes that supersede.
Rerank search results for a research question | After a keyword or vector search returns candidates, score each one against the research question and reorder. | Noul, Score | [Built elsewhere]{.elsewhere} | noul: "Would this opinion excerpt be useful evidence for answering `question`?" | A LlamaIndex adapter reports nDCG@5 rising from 0.340 to 0.396 on nfcorpus and 0.629 to 0.715 on SciFact at about $0.0003 per query, and it keeps the original order if Jev fails[[13](#s13)]{.c}. jev-reranker adds a cutoff that drops weak candidates[[36](#s36)]{.c}. | The largest independent study found Jev alone slightly worse than an embedding ranker under independent labels, and better only when fused with it. No reranker rescues a candidate list that missed the relevant cases[[9](#s9)]{.c}. Score one row per request when order matters[[10](#s10)]{.c}.
Query dockets and opinions in plain English | Add a natural-language predicate to SQL over a table of docket entries or opinions. | Noul, Choice | [Built elsewhere]{.elsewhere} | SELECT * FROM docket_entries\nWHERE court = 'cand' AND date_filed > '2025-01-01'\n  AND jev(docket_entries, 'the court granted a motion to dismiss in full'); | jevql runs ordinary SQL first, then asks Jev about each surviving row and caches the answers. Extensions exist for SQLite, DuckDB, and Postgres[[12](#s12)]{.c}[[35](#s35)]{.c}[[11](#s11)]{.c}. One reports 2,000 rows in 3.5 seconds for about $0.012[[11](#s11)]{.c}. | Every such query is a full scan of the rows that survive the SQL filter. Accuracy drops with more than 20 to 25 rows per request[[11](#s11)]{.c}. The SQLite author warns that text in a row can steer the model, which matters when the rows are adversarial filings[[35](#s35)]{.c}.
Label docket entries without a training set | Tag each docket entry with events such as motion, order, or judgment, and attributes such as granted or denied. | Noul | [Not built]{.untried} | One noul per label, all in the same request:\n  "Is this entry a motion?"   "Is this entry an order?"\n  "Does it grant relief in full?"   "Does it set a deadline?" | SCALES already does this with a fine-tuned model over 70+ labels, pretrained on 11 million docket entries[[26](#s26)]{.c}. TypeSafe's guidance is one Noul per label when several can apply, and questions in a single request add little latency[[4](#s4)]{.c}[[14](#s14)]{.c}. The appeal is a new label defined in a sentence rather than by retraining. | A trained classifier may simply be better. In one test a naive Bayes baseline beat Jev on a 12-class task[[8](#s8)]{.c}. Compare against SCALES before building on this.
Forecast rulings on motions to dismiss | For each claim against each defendant, estimate the probability that the first written disposition dismisses it in full. | Noul | [Built for law]{.law} | noul: "Will the frozen claim against the identified defendant or defendant\n  group be fully dismissed in that disposition?" | LegalForecast-MTD is the only legal entry in awesome-jev. It was built by a practicing attorney, covers 91 cases, screens outcome-leaking text, requires a model's training cutoff to predate the decision, and scores probabilities with a Brier metric[[17](#s17)]{.c}. Its code calls the Jev API directly. | No validated results have been published; the README says preliminary rows are withheld[[17](#s17)]{.c}. Older work sets expectations: 70.2% on Supreme Court outcomes[[30](#s30)]{.c}, a statistical model beating experts 75% to 59.1%[[31](#s31)]{.c}, and a summary-judgment model that only tied a baseline using party identity[[32](#s32)]{.c}.
Match parentheticals to holdings | Given a citing context and a handful of candidate holding statements, pick the one the case stands for, or test whether a draft parenthetical matches. | Choice | [Not built]{.untried} | choice: "Which statement is the holding of the cited case as used here?"\n  up to five candidate holdings, plus none_of_these | CaseHOLD is 53,137 questions in exactly this form, five candidates each, where a legal-domain BERT reached 0.695 F1[[25](#s25)]{.c}. The documented Jev examples use three options; five is untested. | Untested with Jev. The candidates must come from somewhere, so this needs a generator or a headnote source upstream, and holding against dicta is contested even among people.
Code opinions for empirical research | Fill in a coding sheet for thousands of opinions: outcome, standard of review, whether a doctrine was applied, how much discussion it got. | Choice, Score, Noul | [Built elsewhere]{.elsewhere} | Ten questions in one request. Put the codebook in the criteria:\n  "criteria": { "applied": "The court used the test to decide the issue",\n                "mentioned": "The court named the test without using it" } | Several questions ride on one pass over the state, and one measurement found ten no slower than one[[14](#s14)]{.c}. A triage dashboard keeps every human correction and shows it to the model on later runs[[34](#s34)]{.c}. Chandler lists tabular review and research grids among the uses[[18](#s18)]{.c}. | Score was the weakest type out of distribution, at 44.7% accuracy when the label depended on a policy missing from the text[[6](#s6)]{.c}. Report agreement with human coders the way any content analysis would.
Triage reference and intake questions | Route an incoming question to the right desk, flag urgency, and spot the legal issue area before a person picks it up. | Choice, Noul | [Built elsewhere]{.elsewhere} | choice: "Which area of law does this question concern?"\n  housing \| family \| consumer \| employment \| other\nnoul:   "Does the message mention a deadline within 14 days?" | Routing is the most common pattern in awesome-jev, with low-confidence answers sent to human review[[1](#s1)]{.c}. LegalBench includes 16 binary issue-spotting tasks[[24](#s24)]{.c}. Chandler lists legal-aid intake[[18](#s18)]{.c}. | Intake messages are confidential by nature, and zero data retention is an enterprise term[[3](#s3)]{.c}[[18](#s18)]{.c}. A forced choice can also drop a qualifier that mattered, a failure commenters raised at launch[[29](#s29)]{.c}.
```

## Use the probability to decide who reads what {#bands nav="Thresholds"}

The projects that use Jev carefully all do the same thing with its numbers. Answers above one threshold pass, answers below another get flagged, and the middle goes to a person. One prose linter reports nothing at all between 0.4 and 0.6.[[15](#s15)]{.c} The citation-verifier sends every row under 0.8 to human review.[[16](#s16)]{.c}

Below are 240 simulated cite-checks. Move the thresholds and watch who ends up reading what. Then switch the calibration: an independent test found Jev's probabilities well calibrated on familiar benchmarks but overconfident for Choice and underconfident for Noul on material it had not seen.[[6](#s6)]{.c}

```triage {zone-colors="bad warn accent" title="240 simulated cite-checks" hint="Drag the thresholds · switch the calibration" lo=0.30 hi=0.85 lo-label="Flag below" hi-label="Accept above" scenario="Model calibration" axis="Reported probability that the source supports the proposition"}
class yes: Source really does support the proposition | accent good
class no: Source does not support it | bad ring
yes: .092725 .55773 .984478 .901656 .708548 .807172 .462743 .968709 .120658 .558901 .936832 .826558 .994972 .034755 .966832 .788615 .892045 .95276 .882527 .838437 .82873 .812602 .792137 .911655 .17299 .879613 .625698 .815392 .838839 .814571 .996172 .849852 .984687 .915604 .315204 .888023 .960976 .869957 .95497 .558128 .752809 .969904 .226856 .575163 .950941 .772864 .532235 .880705 .844987 .890066 .880097 .977517 .967693 .305437 .961458 .916816 .990724 .887956 .983674 .56239 .92309 .773695 .860002 .557403 .889865 .852087 .858916 .682523 .240003 .748397 .955948 .861847 .622429 .799379 .83272 .89368 .79441 .817286 .853457 .921275 .944456 .431049 .96437 .996972 .820625 .384954 .677613 .32155 .686213 .949549 .708662 .957437 .931335 .36537 .55228 .954878 .56637 .627674 .801704 .5643 .4643 .989523 .690161 .785734 .595909 .959028 .89709 .944705 .982774 .957 .799569 .797763 .862882 .747397 .443521 .709953 .689129 .998097 .886843 .897203 .747294 .922496 .814835 .899595 .966262 .616306 .343104 .316251 .966073 .963322 .272256 .756605 .639101 .96064 .634047 .79755 .986202 .96106 .540825 .935501 .509956 .950881 .860343 .487647
no: .62852 .663985 .239131 .339452 .501654 .58626 .213891 .532333 .063239 .086102 .677902 .069097 .730367 .656945 .210594 .133224 .473137 .182087 .27493 .036848 .469504 .663278 .092084 .195215 .78594 .504548 .206204 .329456 .125722 .467886 .608361 .218334 .064829 .144258 .305491 .384282 .180159 .168321 .106893 .033291 .075681 .139286 .091346 .341905 .638382 .164726 .902224 .674205 .656724 .014957 .133586 .072216 .276373 .328159 .053382 .716427 .0048 .096494 .605972 .201345 .015968 .665898 .777289 .289079 .456876 .005592 .014297 .311624 .451626 .241235 .103868 .008989 .036389 .085367 .080021 .24964 .432953 .501768 .38617 .04169 .614391 .365715 .078599 .522278 .986796 .381 .24935 .528376 .095122 .176954 .12117 .422038 .599388 .109772 .663934 .517755
scenario Well calibrated: round(p, 2)
scenario Overconfident (Choice, out of distribution): round(sigmoid(logit(p)*3.29), 2)
scenario Underconfident (Noul, out of distribution): round(sigmoid(logit(p)*0.66), 2)
zone low: Flag | flagged as unsupported. **{lowGood}** of them were fine.
zone mid: Person reads | sent to a person, **{mid/total | percent}** of the pile.
zone high: Accept | accepted without review. **{highBad}** of them were bad cites (**{high ? highBad/high : 0 | pct1}**).
```

Simulated data, not Jev output. The overconfident and underconfident settings use the refit temperatures (3.29 and 0.66) from one independent out-of-distribution test.[[6](#s6)]{.c} Probabilities are rounded to two decimals, as the API does.[[7](#s7)]{.c} That test's author also advises against thresholding on the `confidence` field, which never beat the top probability. {.note}

The jevcal project turns this into a routine: label at least 100 examples per question, choose the threshold on half, verify it on the other half, and fail the build when a model update breaks it.[[7](#s7)]{.c} A second library adds separate enter and exit thresholds so an alert does not flap when a score hovers near the line.[[33](#s33)]{.c}

## What a corpus-wide pass would cost {#scale nav="Scale and cost"}

Seth Chandler's observation about citators is a claim about price: classifying how each citing opinion treats an earlier case becomes cheap enough to run across the whole CourtListener corpus.[[18](#s18)]{.c} The arithmetic is simple enough to check. Cost is input tokens times $0.042 per million. The floor on wall-clock time comes from the published rate limits.[[3](#s3)]{.c}

```calc {title="Price a corpus-wide pass" hint="Pick a preset or drag the sliders"}
preset 5,000 cite-checks: n=5000, t=500, q=3
preset 1 million citing passages: n=1e6, t=600, q=4
preset 100,000 full opinions, 10 variables: n=100000, t=40000, q=10
slider n: Requests | 1e6 | 100 to 1e8 | log | count
slider t: Tokens of text per request | 603 | 100 to 64565 | log | int
slider q: Questions per request | 4 | 1 to 10 | step 1
let per = t + q*40
let total = n*per
result at list price, output free | total/1e6*0.042 | money
result typed decisions returned | n*q | count
result minimum elapsed time under the rate limits | max(n/1200*60, total/250000) | duration
meter per/32000 | over per > 32000
say if per > 32000: {per | int} tokens per request exceeds the 32,000-token limit. Each document must be split into {ceil(t/(32000-q*40))} or more chunks, and you write the rule that combines their answers.
say if per <= 32000: {per | int} tokens per request uses {round(per/320)}% of the 32,000-token limit.
```

Assumes 40 tokens per question, which is a guess; one measurement put ten questions at $0.0000167 per request against $0.0000120 for one.[[14](#s14)]{.c} Preset token counts are rough. Rate limits may differ through OpenRouter, Vercel, or Cloudflare. {.note}

## Where it has already broken {#limits nav="Limits"}

No one has published an independent measurement of Jev on U.S. court opinions. These results come from other domains, and each maps onto a legal use.

```glossary
Result | What happened
**32k tokens** [state plus longest question]{.muted} | Long opinions will not fit. You split them, ask the same question of each chunk, and write the rule that combines the answers. A tester's 53,000-character document only just fit.[[3](#s3)]{.c}[[5](#s5)]{.c}
**0.400 vs. 0.911** [accuracy, one 12-way Choice vs. 14 narrow questions]{.muted} | **Long option lists fail.** On a 12-class accounting task, a single Choice scored 0.400. Having Jev score 14 narrow dimensions and fitting weights to them locally scored 0.911. A naive Bayes baseline on word pairs scored 0.949. Choice is reportedly capped at 10 options. Citator phrases, the eleven Bluebook signals, and SCALES's 70+ docket labels all need decomposing.[[8](#s8)]{.c}[[29](#s29)]{.c}
**0.932 → 0.579** [rank agreement with the baseline, 1 row vs. 40 rows per request]{.muted} | **Batching rows corrupts rankings.** Packing 40 rows into one request moved 51% of yes/no probabilities by more than 0.20, and Score rankings fell further, from 0.974 to 0.506. A Postgres extension reports accuracy falling above 20 to 25 rows. Graded relevance fared worse than topic labels.[[10](#s10)]{.c}[[11](#s11)]{.c}
**−0.028 NDCG@10** [Jev alone vs. an embedding ranker]{.muted} | **Reranking alone did not beat vector search** under independent labels, across 9,831 graded pairs. Fusing the two rankings gained 0.090. The same study found that grading Jev with Jev-written labels flipped the sign.[[9](#s9)]{.c}
**0.040 → 0.116** [calibration error after adding qualifiers]{.muted} | **Lawyerly questions score worse.** Adding careful multi-clause qualifiers to a question raised calibration error and lowered agreement. A linter for question sets warns on compound questions, conditionals, and Choice lists with no escape option.[[5](#s5)]{.c}[[14](#s14)]{.c}
**44.7% at 0.74** [accuracy vs. average stated probability]{.muted} | **It cannot apply a rule it was not given.** When the right Score depended on a policy absent from the text, accuracy fell to 44.7% while the model stayed confident. A local rule or a codebook has to be in the criteria.[[6](#s6)]{.c}
**No passage** [no quote, no reasoning, no retrieval]{.muted} | Chandler: "A probability with no passage attached is hard to check and hard to defend."[[18](#s18)]{.c} The citation-verifier pairs Jev with a language model that finds the quote and with code that confirms the quote is verbatim in the source.[[16](#s16)]{.c}
**Confidentiality** [zero retention is an enterprise term]{.muted} | TypeSafe says it does not train on requests, and offers zero data retention to enterprise customers under a data processing agreement.[[3](#s3)]{.c} Chandler, after reading the privacy policy, has "serious reservations about using Jev in representing a client or processing confidential information of any sort."[[18](#s18)]{.c} Public opinions and dockets avoid the problem.
**Rule 1.1** [ABA Formal Opinion 512]{.muted} | Relying on a generative AI tool's output "without an appropriate degree of independent verification or review" can breach the duty of competence.[[28](#s28)]{.c} A high probability can set the reading order. The lawyer still reads the case.
```

## A cite-check gate for drafts, on public case law {#first nav="First project"}

This combines the two strongest precedents: the citation-verifier pipeline and jevcal's threshold routine. It is an inference from those projects. Nobody has published it for case law, and the thresholds would need a labeled set of legal citations before anyone relied on them.

| Step | What happens | Who does it |
|---|---|---|
| 1 · **Extract and resolve** | Pull every citation from the draft and confirm each case exists in CourtListener. A failed lookup is a possible fabrication. | code |
| 2 · **Locate the passage** | Find the pin-cited page or the best candidate passage. Confirm any quoted language appears verbatim. | search or LLM, then code |
| 3 · **Ask one Choice** | Does the passage support, contradict, or say nothing about the sentence citing it? | [Jev]{.elsewhere} |
| 4 · **Apply fitted bands** | Thresholds chosen on 100+ labeled pairs and verified on held-out pairs. | code |
| 5 · **Read** | A person reads everything outside the accept band, and samples inside it. | [lawyer or librarian]{.law} |
{.compare}

Damien Charlotin's database listed 2,045 court decisions involving hallucinated material on September 19, 2026, 1,397 of them in the United States.[[23](#s23)]{.c} Step one addresses the invented case. Step three addresses the misgrounded one.

## What this page rests on {#sources .sources}

The awesome-jev list states that a listing is not an endorsement, and several linked projects are days old.[[1](#s1)]{.c} Figures marked vendor come from TypeSafe. Figures marked independent come from outside testers and have not been replicated.

1. [awesome-jev, curated list of Jev projects](https://github.com/yibie/awesome-jev) [· list]{.muted} {#s1}
2. [TypeSafe AI, Introducing System One Models and Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev) [· vendor]{.muted} {#s2}
3. [TypeSafe docs: models, pricing, limits, data handling](https://docs.typesafe.ai/models) [· vendor]{.muted} {#s3}
4. [TypeSafe docs: API reference and primitives](https://docs.typesafe.ai/api) [· vendor]{.muted} {#s4}
5. [Lindfors, An early-access test of TypeSafe's Jev](https://lindfors.no/blog/a-first-look-at-typesafes-jev/) [· independent]{.muted} {#s5}
6. [jev-ood-calibration, out-of-distribution calibration test](https://github.com/scienthoon/jev-ood-calibration) [· independent]{.muted} {#s6}
7. [jevcal, per-question threshold fitting](https://github.com/abhixhek/jevcal) [· project]{.muted} {#s7}
8. [Agent Journal, judge call vs. dimension scores](https://agentjournal.dev/blog/llm-judge-vs-feature-extraction/) [· independent]{.muted} {#s8}
9. [jev-search-rerank-eval, reranking study](https://github.com/zhuyansen/jev-search-rerank-eval) [· independent]{.muted} {#s9}
10. [jev-orderby-bench, is ORDER BY on a probability defensible](https://github.com/yodablocks/jev-orderby-bench) [· independent]{.muted} {#s10}
11. [pg-jev, Postgres extension](https://github.com/realZachi/pg-jev) [· project]{.muted} {#s11}
12. [jevql, SQL with Jev predicates](https://github.com/kylemclaren/jevql) [· project]{.muted} {#s12}
13. [llama-index-jev, reranker and selector](https://github.com/WiktorB2004/llama-index-jev) [· project]{.muted} {#s13}
14. [jevkit, question-set linter](https://github.com/ariel-frischer/jevkit) [· project]{.muted} {#s14}
15. [Sniff Test, prose linter](https://github.com/DanRWilloughby/snifftest) [· project]{.muted} {#s15}
16. [citation-verifier, does the cited paper support the sentence](https://github.com/MarissaFamularo/citation-verifier) [· project]{.muted} {#s16}
17. [LegalForecastBench, motion-to-dismiss forecasting](https://github.com/johnhughes3/LegalForecastBench) [· project]{.muted} {#s17}
18. [Seth Chandler, What Jev might mean to the legal world](https://legaled.ai/what-jev-might-mean-to-the-legal-world/) [· commentary]{.muted} {#s18}
19. [Hellyer, Evaluating Shepard's, KeyCite, and BCite, 110 Law Libr. J. 449 (2018)](https://www.aallnet.org/wp-content/uploads/2018/12/LLJ_110n4_02_hellyer.pdf) [· study]{.muted} {#s19}
20. [Free Law Project, open citator announcement and annotation update](https://free.law/2025/09/30/citator-annotation-updates/) [· project]{.muted} {#s20}
21. [Demir & Canbaz, Validate Your Authority, NLLP 2025](https://aclanthology.org/2025.nllp-1.13/) [· study]{.muted} {#s21}
22. [Magesh et al., Hallucination-Free? (Stanford RegLab)](https://arxiv.org/abs/2405.20362) [· study]{.muted} {#s22}
23. [Charlotin, AI Hallucination Cases database](https://www.damiencharlotin.com/hallucinations/) [· database]{.muted} {#s23}
24. [Guha et al., LegalBench](https://arxiv.org/abs/2308.11462) [· study]{.muted} {#s24}
25. [Zheng et al., CaseHOLD and the Overruling dataset](https://arxiv.org/abs/2104.08671) [· study]{.muted} {#s25}
26. [SCALES-OKN litigation ontology and NLP docs](https://docs.scales-okn.org/nlp/) [· project]{.muted} {#s26}
27. [Tarlton Law Library, Bluebook introductory signals](https://tarlton.law.utexas.edu/bluebook-legal-citation/intro-signals) [· guide]{.muted} {#s27}
28. [ABA Formal Opinion 512 (July 29, 2024)](https://www.lawnext.com/wp-content/uploads/2024/07/aba-formal-opinion-512.pdf) [· ethics opinion]{.muted} {#s28}
29. [Hacker News launch thread](https://news.ycombinator.com/item?id=49717558) [· commentary]{.muted} {#s29}
30. [Katz, Bommarito & Blackman, predicting Supreme Court behavior (2017)](https://journals.plos.org/plosone/article?id=10.1371/journal.pone.0174698) [· study]{.muted} {#s30}
31. [Ruger et al., The Supreme Court Forecasting Project (2004)](https://scholarship.law.upenn.edu/faculty_scholarship/672/) [· study]{.muted} {#s31}
32. [Tippett et al., Does Lawyering Matter?, Texas L. Rev.](https://texaslawreview.org/does-lawyering-matter-predicting-judicial-decisions-from-legal-briefs-and-what-that-means-for-access-to-justice/) [· study]{.muted} {#s32}
33. [huncho, thresholds with hysteresis and replay](https://github.com/edgardcham/huncho) [· project]{.muted} {#s33}
34. [jev-triage, triage with kept human corrections](https://github.com/cephalization/jev-triage) [· project]{.muted} {#s34}
35. [sqlite-jev, SQLite extension](https://github.com/mgaitan/sqlite-jev) [· project]{.muted} {#s35}
36. [jev-reranker](https://github.com/hotchpotch/jev-reranker) [· project]{.muted} {#s36}
