---
title: triage — the two threshold demos
theme: field-guide
---

## Use the probability to decide who reads what {nav="Thresholds"}

Below are 240 simulated cite-checks. Move the thresholds and watch who ends up reading what. Then switch the calibration.

```triage {title="Who reads what" lo=0.30 hi=0.85 lo-label="Flag below" hi-label="Accept above" scenario="Model calibration" axis="Reported probability that the source supports the proposition"}
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

Simulated data, not Jev output. {.note}

## Jev is reliable at the ends and mushy in the middle {nav="Funnel"}

```triage {title="Two-threshold funnel" .rows lo=0.13 hi=0.90 lo-range="0.01 0.49" hi-range="0.5 0.99" lo-incl=yes lo-label="Flag at or below" hi-label="Clear at or above" scenario="Question wording" axis="Probability the claim is fully supported"}
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
say if highBad + lowGood > 0: [{highBad} partial or unsupported cleared without review; {lowGood} supported falsely flagged.]{.warn} Outlined dots are the errors.
say if highBad + lowGood == 0: No bad clears and no false flags. {mid/total | percent} of claims still need the LLM: the savings come only from the ends.
```
