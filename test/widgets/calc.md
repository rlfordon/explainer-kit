---
title: calc — the corpus cost demo
theme: field-guide
---

## What a corpus-wide pass would cost {nav="Scale and cost"}

Cost is input tokens times $0.042 per million. The floor on wall-clock time comes from the published rate limits.

```calc {title="Price a pass" hint="Drag a slider or pick a preset"}
preset 5,000 cite-checks: n=5000, t=500, q=3
preset 1 million citing passages: n=1e6, t=600, q=4
preset 100,000 full opinions, 10 variables: n=100000, t=40000, q=10
slider n: Requests | 1e6 | 100 to 1e8 | log | count
slider t: Tokens of text per request | 600 | 100 to 64565 | log | int
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

Assumes 40 tokens per question, which is a guess. {.note}
