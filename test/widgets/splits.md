---
title: Splits widget test
dek: A port of the taxonomy debugger from jev-beyond-classification.html, §5.
theme: field-guide
---

## A taxonomy’s confusions show up in the distributions {#taxonomy nav="Taxonomy"}

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

## A dark band {.dark nav="Dark"}

The same widget inside a dark section.

```splits {title="Dark band" seed=7 escape=None}
categories: Follows, Applies, Distinguishes, Limits, Criticizes, Overrules, Mentions, None
28: Follows 0.3+0.3, Applies 0.25+0.3 / Applies 0.3+0.3, Follows 0.25+0.3
14: Distinguishes 0.5+0.3, Limits 0.1+0.25
8: Limits 0.35+0.2, Distinguishes 0.25+0.25
5: Limits 0.35+0.15, Criticizes 0.25+0.15
5: Overrules 0.8+0.15
14: Mentions 0.5+0.3, None 0.1+0.2
6: None 0.55+0.3, Mentions 0.1+0.2
fix Merge Follows + Applies: Follows, Applies -> Relies on
```
