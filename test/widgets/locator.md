---
title: Locator widget test
dek: A port of the heat-map demo from jev-beyond-classification.html, §4.
theme: field-guide
---

## Jev cannot cite, but it can point at what you number {#heatmap nav="Heat map"}

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

## A dark band {.dark nav="Dark"}

The same widget inside a dark section, with only the relative mode.

```locator {title="Relative only" relative="Choice across paragraphs"}
question: Where does the court state the standard of review? | de novo 2.5, clear error 2.5, review 1.2
passage Standard: We review legal conclusions de novo and findings of fact for clear error.
passage Holding: We hold that the clothing exception does not require a request when exposure makes clothing reasonably necessary.
passage Disposition: Affirmed.
```
