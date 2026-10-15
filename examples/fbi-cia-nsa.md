---
title: FBI, CIA, NSA: who does what, and under what law
dek: Three agencies work the same subjects — terrorism, foreign spies, cyber intrusions — under three different legal regimes. This page maps the boundaries: who each one may target, where, on whose approval, and who is watching.
description: How the FBI, CIA, and NSA actually divide the work: purpose and target rather than subject matter. Jurisdiction, Title 18 vs Title 50, EO 12333, FISA Section 702, oversight, and where the three agencies overlap.
brand: FBI · CIA · NSA
theme: brief
colors: fbi=#1d4e89 cia=#7d5f18 nsa=#1a6b5e
meta: Reading time ~10 min | 2 interactive demos | Updated August 2026 | US law · primary sources linked
---

```cards {.mono}
Tag | Role
FBI {.fbi} | Federal law enforcement and the country’s domestic intelligence service, inside the Justice Department.
CIA {.cia} | Foreign human intelligence, all-source analysis, and covert action. No arrest powers.
NSA {.nsa} | Signals intelligence and cybersecurity, run as a Defense Department combat support agency.
```

## The three agencies side by side {#glance nav="At a glance"}

| Attribute | FBI {.fbi} | CIA {.cia} | NSA {.nsa} |
| --- | --- | --- | --- |
| Created | 1908, as the Bureau of Investigation | 1947, by the National Security Act | 1952, by a classified presidential memorandum |
| Sits inside | Department of Justice | Independent agency; reports through the Director of National Intelligence to the President | Department of Defense, and part of the Intelligence Community under the DNI |
| Core mission | Investigate federal crimes; run domestic counterintelligence and counterterrorism | Recruit and run human sources abroad; produce all-source analysis; conduct covert action | Intercept and analyze foreign communications and electronic signals; defend national security systems |
| Primary legal home | Title 18 (crimes) and Title 50 (foreign intelligence) | Title 50 | Title 50 and Title 10 (armed forces) |
| Arrest powers | [Yes]{.yes} — sworn agents make arrests and execute criminal search warrants | [No]{.no} — statute denies it police, subpoena, and law-enforcement powers | [No]{.no} |
| May target a US person | [Yes]{.yes} — with a criminal warrant or an individual FISA order | Only under narrow Attorney General–approved procedures; no domestic security role | Only with an individual FISA Court order |
| Covert action | [No]{.no} | [Yes]{.yes} — on a written presidential finding reported to Congress | [No]{.no} |
| Answers to | FISA Court, House and Senate Intelligence and Judiciary committees, DOJ Inspector General | House and Senate Intelligence committees, CIA Inspector General, ODNI | FISA Court, House and Senate Intelligence committees, NSA and DoD Inspectors General |
{.compare}

Budgets and headcounts for all three are classified in whole or in part. Aggregate intelligence spending is published annually; agency-level detail is not. {.note}

## Two questions divide the work {#model nav="The model" cols="1.15 .85"}

All three agencies work terrorism. All three work counterintelligence. All three work cyber. Subject matter does not divide them, which is why the popular shorthand of “FBI handles crime, CIA handles spies, NSA handles hacking” falls apart on contact with any real case.

Two questions do the dividing. The first is **purpose**: is this activity building evidence or producing intelligence? Evidence has to survive an American courtroom, so it is gathered under rules a judge will later test, and it must eventually be shown to the defense. Intelligence informs the President and policymakers. It never faces cross-examination, and it is often collected under authorities no court reviews.

The second is **target**: is the subject a US person? The term is statutory and covers citizens, lawful permanent residents, and US-incorporated entities, wherever in the world they happen to be. Nearly every restriction in American intelligence law attaches to that status rather than to geography.

Plot the two questions against each other and the division of labor becomes visible. The FBI occupies most of the space because it is the only one of the three that does both jobs. The CIA and NSA hold a single quadrant, and hold it with very few constraints.

|

```html
<div class="quad" role="img" aria-label="A two-by-two grid. Rows are target: US person on top, non-US person below. Columns are purpose: evidence on the left, intelligence on the right. FBI occupies the US-person evidence cell alone, the US-person intelligence cell alone, and the non-US-person evidence cell alone. The non-US-person intelligence cell is held by the CIA and NSA.">
  <div></div><div class="colh">Purpose: evidence</div><div class="colh">Purpose: intelligence</div>
  <div class="axl"><span>Target</span></div>
  <div class="cell hot"><div class="rowl">US person</div><div class="occ"><span class="chip c-fbi">FBI</span></div><p>Criminal warrants, grand juries, Title III wiretaps. A judge signs first.</p></div>
  <div class="cell hot"><div class="rowl">US person</div><div class="occ"><span class="chip c-fbi">FBI</span></div><p>Individual FISA orders. A judge still signs, on a different standard.</p></div>
  <div class="cell"><div class="rowl">Non-US person</div><div class="occ"><span class="chip c-fbi">FBI</span></div><p>Extraterritorial statutes and host-country cooperation. Slow and consent-dependent.</p></div>
  <div class="cell cold"><div class="rowl">Non-US person</div><div class="occ"><span class="chip c-cia">CIA</span><span class="chip c-nsa">NSA</span></div><p>EO 12333 and FISA §702. Largely no individual court approval.</p></div>
</div>
```

```style
.quad{display:grid;grid-template-columns:64px 1fr 1fr;grid-template-rows:auto 1fr 1fr;gap:var(--s2);min-height:340px}
.quad .axl{grid-row:2 / span 2;display:flex;align-items:center;justify-content:center}
.quad .axl span{transform:rotate(180deg);writing-mode:vertical-rl;font-family:var(--mono);font-size:11.5px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-3)}
.quad .colh{font-family:var(--mono);font-size:11.5px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-3);padding-bottom:var(--s2);text-align:center}
.quad .cell{border:1px solid var(--line-2);background:var(--surface-2);padding:var(--s4);display:flex;flex-direction:column;gap:var(--s2);border-radius:3px}
.quad .rowl{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-3)}
.quad .occ{display:flex;flex-wrap:wrap;gap:5px}
.quad .cell p{font-size:14px;color:var(--ink-2);margin:0;line-height:1.5}
.quad .cell.hot{background:rgba(29,78,137,.10);border-color:#1d4e89}
.quad .cell.cold{background:rgba(125,95,24,.12);border-color:#7d5f18}
@media (max-width:640px){.quad{grid-template-columns:34px 1fr 1fr;min-height:0}.quad .cell{padding:var(--s3)}}
```

---

```router {#router title="Who has the lead?" hint="Set all three · verdict updates live"}
Who is the subject:option | Where they are:option | What it is for:option | Governing authority | Approval | Why:long | Lead | Supporting | No role
A US person | Inside the US | A prosecution | Title 18 criminal process | [Federal judge, probable cause of a crime]{.ok} | An ordinary criminal case against someone on US soil. The FBI works it under the criminal code, and everything it gathers has to hold up in court and be turned over to the defense. | [FBI]{.fbi} | [none]{.muted} | [CIA]{.cia} [NSA]{.nsa}
A US person | Inside the US | Foreign intelligence | FISA Title I order | [FISA Court, probable cause the target is an agent of a foreign power]{.ok} | Domestic counterintelligence. The standard is not probable cause of a crime but probable cause that the person is acting for a foreign power. The NSA may provide technical collection under the same order. | [FBI]{.fbi} | [NSA]{.nsa} | [CIA]{.cia}
A US person | Abroad | A prosecution | Title 18, extraterritorial | [Federal judge, plus host-country consent to act]{.ok} | American law reaches some crimes committed abroad, but the FBI cannot arrest or search on foreign soil without the host government. Legal attachés in US embassies exist to negotiate exactly this. | [FBI]{.fbi} | [CIA]{.cia} | [NSA]{.nsa}
A US person | Abroad | Foreign intelligence | FISA §704 individual order | [FISA Court order, plus an Attorney General finding]{.ok} | US-person status follows the person overseas. Targeting an American abroad for foreign intelligence needs individualized court approval, even though collection against the foreigners around them does not. | [FBI]{.fbi} | [CIA]{.cia} [NSA]{.nsa} | [none]{.muted}
A foreign national | Inside the US | A prosecution | Title 18 criminal process | [Federal judge, probable cause of a crime]{.ok} | Citizenship does not change criminal procedure. A foreign national charged with a federal crime inside the United States gets the same Fourth Amendment protections as anyone else. | [FBI]{.fbi} | [none]{.muted} | [CIA]{.cia} [NSA]{.nsa}
A foreign national | Inside the US | Foreign intelligence | FISA Title I order | [FISA Court, probable cause the target is an agent of a foreign power]{.ok} | A foreign intelligence officer operating inside the United States is a domestic counterintelligence problem. The FBI runs it; the CIA may hold the foreign-side picture and share it. | [FBI]{.fbi} | [CIA]{.cia} [NSA]{.nsa} | [none]{.muted}
A foreign national | Abroad | A prosecution | Title 18, extraterritorial | [Federal judge, plus an extradition or an arrest in transit]{.ok} | Indicting a foreign hacker or arms dealer is routine. Getting custody is not, and intelligence that identified them often cannot be used as evidence without exposing how it was collected. | [FBI]{.fbi} | [CIA]{.cia} [NSA]{.nsa} | [none]{.muted}
A foreign national | Abroad | Foreign intelligence | EO 12333 and FISA §702 | [No individual court approval]{.bad} | The core intelligence mission. Collection abroad runs on Executive Order 12333 with no judicial review. Collection routed through US providers runs on §702, where the FISA Court approves annual procedures rather than individual targets. | [CIA]{.cia} [NSA]{.nsa} | [FBI]{.fbi} | [none]{.muted}
```

## Three claims worth correcting {#wrong nav="What people get wrong"}

```myths
- The CIA is banned from operating inside the United States.
  > The National Security Act denies the CIA police powers, subpoena power, law-enforcement powers, and internal security functions. It does not confine the agency to foreign soil. The CIA maintains domestic facilities, debriefs willing Americans, recruits foreign nationals who happen to be in the country, and works counterintelligence cases jointly with the FBI. The prohibition is on *function*, not on *location*.
- The NSA is forbidden from collecting Americans’ communications.
  > The NSA may not *target* a US person without an individual order from the FISA Court. It acquires Americans’ communications constantly by another route: when an American corresponds with a targeted foreigner, that message is collected too. This is called incidental collection, it is lawful, and the resulting communications are retained under minimization procedures.
  >
  > Who may later search that retained pool, and on what showing, is the most contested question in US surveillance law.
- The FBI is a police force.
  > A large share of the FBI’s work has no prosecution in view. Its National Security Branch collects foreign intelligence and runs counterintelligence under FISA and Executive Order 12333, and those cases can run for years without a charge because a charge was never the point.
  >
  > The United States has no separate domestic intelligence service in the mold of Britain’s MI5. The FBI does that job as well, which is why its authorities and its oversight are more tangled than either of the other two.
```

## Five authorities do most of the work {#law nav="The law"}

Which one applies decides whether a judge is involved, what standard the government must meet, and whether anything collected can ever be used in court. {.lede}

```glossary {.grid}
Authority | What it does
Title 18 | The federal criminal code. Grand jury subpoenas, Rule 41 search warrants, Title III wiretaps. The government must show probable cause of a crime to an ordinary federal judge, and what it collects is eventually disclosed to the defense.
Title 50 | War and national defense. The National Security Act of 1947 and FISA both live here. Authorizes collection for intelligence purposes with no prosecution required and, in places, no court involved.
Title 10 | The armed forces. The NSA is a Defense Department combat support agency, so part of its work runs on military authority alongside US Cyber Command, whose commander has historically also directed the NSA.
Executive Order 12333 [(1981)]{.muted} | The charter for intelligence collected outside the FISA framework, which in practice means most collection that happens overseas. It is a presidential order, so the President can amend it. No statute sets its limits and no court reviews collection under it.
FISA [(1978)]{.muted} | Created the Foreign Intelligence Surveillance Court. Title I orders require probable cause that the target is a foreign power or its agent. Section 702, added in 2008, permits warrantless targeting of non-US persons reasonably believed to be abroad using compelled help from US providers. Sections 704 and 705 cover US persons overseas.
```

```stepper {#tracer title="Follow one message" hint="Pick a message · step through the four gates" rail="The target|Collection point|The authority|US persons" unit=Gate next="Next gate" pick="Choose a communication to trace"}
- **Message A** Two foreign officials abroad, talking on a foreign network.
  1. **Who is the target?** A foreign government official located outside the United States. No US person is a party to the conversation and none is the object of the collection.
  2. **Where does the government get it?** From collection infrastructure abroad — a foreign cable, a satellite link, a compromised network. Nothing is compelled from an American company, so no US provider is involved.
  3. **What law authorizes it?** Executive Order 12333, a presidential order rather than a statute. The Attorney General approves the collection and minimization procedures. No judge reviews any of it.

     [No court, no warrant, no statute]{.bad}
  4. **What happens to Americans in the data?** If an American turns up incidentally, minimization procedures require the identity to be masked in reporting unless a specific need justifies unmasking. Those procedures are written and enforced inside the executive branch.
- **Message B** A foreign target abroad emails another foreigner, using a US email provider.
  1. **Who is the target?** A non-US person reasonably believed to be located outside the United States, selected because they are expected to produce foreign intelligence. The other party is also a foreigner.
  2. **Where does the government get it?** From a US email or messaging provider, which is served with a directive and legally compelled to assist. The data sits on American infrastructure, which is precisely why a statute is needed.
  3. **What law authorizes it?** FISA Section 702. The FISA Court reviews the targeting, minimization, and querying procedures once a year and certifies the program. Analysts then select individual targets on their own, applying those procedures without returning to the court.

     [FISA Court approves the procedures, not the target]{.ok}
  4. **What happens to Americans in the data?** No American is a party here, so nothing of theirs is acquired. This is the clean case that Section 702 was written for and the one its defenders point to.
- **Message C** A foreign target abroad emails an American in Ohio.
  1. **Who is the target?** Still the foreigner abroad. The American in Ohio is not targeted and cannot lawfully be. Targeting them would be what the statute calls reverse targeting, and it is prohibited.
  2. **Where does the government get it?** The same US provider, under the same directive. Because the American is the correspondent, their message comes in with the target’s.
  3. **What law authorizes it?** FISA Section 702. The American’s communication is acquired incidentally, which is lawful, and it is retained in the §702 repository under minimization rules rather than deleted.

     [Still §702 — still no warrant for the American]{.ok}
  4. **What happens to Americans in the data?** This is the contested ground. The FBI can search the repository using the American’s identifiers. Under the rules Congress wrote in 2024, a query run solely to find evidence of a crime unrelated to national security requires a court order first. Queries for foreign intelligence purposes do not.

     [Court order required for FBI evidence-of-a-crime queries]{.ok}
- **Message D** An American in Ohio, suspected of working for a foreign government.
  1. **Who is the target?** A US person inside the United States, suspected of acting as an agent of a foreign power. US-person status is the trigger for every protection that follows.
  2. **Where does the government get it?** From communications providers inside the United States, or from a physical search, or from a device. All of it is domestic collection against a protected person.
  3. **What law authorizes it?** FISA Title I. The government must persuade the FISA Court that there is probable cause the target is an agent of a foreign power. If the case is criminal instead, the route is a Title III wiretap before an ordinary federal judge on probable cause of a crime.

     [FISA Court order, probable cause, individualized]{.ok}
  4. **What happens to Americans in the data?** Minimization applies throughout, and the order has a fixed duration that must be renewed. If the case turns criminal and the government intends to use the material, the defendant must be notified that FISA-derived evidence is in play.
```

## Who watches, and what they cannot see {#oversight nav="Oversight" colstyle=rule}

Judicial {.kicker}

### The FISA Court

- **FISC** — eleven sitting federal district judges designated by the Chief Justice, hearing applications in a closed courtroom with only the government present. [FBI]{.fbi} [NSA]{.nsa}
- **FISCR** — the appellate court above it. It has issued a handful of public opinions in five decades.
- **Amici curiae** — outside lawyers the court may appoint to argue against the government in novel cases, added by statute in 2015.

|

Legislative {.kicker}

### Four committees

- **Senate and House Intelligence committees** — receive covert action findings, hold classified briefings, and write the annual intelligence authorization. [FBI]{.fbi} [CIA]{.cia} [NSA]{.nsa}
- **Judiciary committees** — own the criminal-side statutes and FISA itself, which is why surveillance reauthorization fights run through them.
- **Appropriations** — the budget is the leverage that actually bites.

|

Executive {.kicker}

### Internal review

- **Inspectors General** — each agency has one, plus a DoD IG over the NSA and an Intelligence Community IG across all of them. [FBI]{.fbi} [CIA]{.cia} [NSA]{.nsa}
- **DOJ National Security Division** — reviews and signs off on FISA applications before they reach the court.
- **PCLOB** — an independent privacy board that has repeatedly lost its quorum, and cannot issue reports without one.

## The seams where the three meet {#seams nav="Overlap"}

A foreign plot aimed at a US city crosses all three jurisdictions in a single afternoon. Three institutions exist to manage that handoff. {.lede}

```cards {.rule}
When | Institution | What it does
Since 1980 | Joint Terrorism Task Forces | FBI-led teams operating in field offices across the country, staffed by state and local police alongside federal agents. They are the mechanism by which a local traffic stop can reach the national counterterrorism system within hours.
2004 | National Counterterrorism Center | Created by the Intelligence Reform and Terrorism Prevention Act and placed under the DNI. It holds the government’s consolidated terrorism identities data and staffs analysts detailed from every agency, which is what makes cross-agency matching possible at all.
Removed 2001–02 | “The wall” | A set of Justice Department practices that kept intelligence investigators and criminal prosecutors apart, so that FISA collection could not be used to build criminal cases. Section 218 of the PATRIOT Act and the FISA Court of Review’s 2002 decision in *In re Sealed Case* dismantled it.
```

```deeper {title="Go deeper: why the wall still matters"}
With the wall gone, information gathered under intelligence authorities can inform criminal investigations. That is the point of the change, and the 9/11 Commission cited the separation as a failure that cost lives. It also produced the query fight: if the government holds Americans’ communications acquired without a criminal warrant, on what showing may an FBI agent search that pool for evidence of a crime? Every Section 702 reauthorization since 2018 has turned on that question.
```

## A century of law, mostly written after 1975 {#history nav="History" .split-head}

Spacing is proportional to elapsed time. The CIA and NSA had existed for decades before any statute governed what they could collect. Select a marker for detail. {.lede}

```timeline {key="statute=Statute or executive order; agency=Agency created; shock=Public reckoning" ticks="1908 1930 1950 1970 1990 2010 2026"}
Year | Kind | Title | Detail
1908 | agency | The Bureau of Investigation is founded | Attorney General Charles Bonaparte creates a small force of investigators inside the Justice Department, without congressional authorization. It is renamed the Federal Bureau of Investigation in 1935.
1947 | agency | The National Security Act creates the CIA | The same statute establishes the National Security Council and the Air Force. It gives the CIA its analytic and clandestine mandate and, in the same breath, denies it police, subpoena, and law-enforcement powers and internal security functions.
1952 | agency | The NSA is created in secret | President Truman signs a classified memorandum consolidating military cryptologic work into a single agency. Its existence is not officially acknowledged for years, and it operates for a quarter century with no statutory charter.
1975 | shock | The Church Committee | Senate investigators document decades of domestic spying, mail opening, and assassination plotting across all three agencies. The hearings produce the political conditions for every restraint that follows.
1978 | statute | FISA and the FISA Court | Congress requires a court order for electronic surveillance conducted inside the United States for foreign intelligence purposes, and creates a special court to issue them. It is the first statute to govern what the NSA may collect.
1981 | statute | Executive Order 12333 | President Reagan issues the charter for intelligence activities outside the FISA framework. Because it is an executive order rather than a statute, its limits are set and can be revised by the President.
2001 | statute | The PATRIOT Act | Passed six weeks after 11 September. Section 218 lets the government use FISA when foreign intelligence is a significant purpose rather than the primary purpose, which is the change that brings down the wall between intelligence and criminal work.
2004 | statute | Intelligence reform creates the DNI | The Intelligence Reform and Terrorism Prevention Act, following the 9/11 Commission, establishes a Director of National Intelligence over the whole community and creates the National Counterterrorism Center.
2008 | statute | Section 702 is added to FISA | The FISA Amendments Act authorizes warrantless targeting of non-US persons abroad using compelled assistance from US providers, replacing the warrantless program run outside the statute after 2001.
2013 | shock | The Snowden disclosures | Leaked documents describe bulk telephone metadata collection and the scale of §702, triggering the first serious public debate about surveillance authorities since 1978.
2015 | statute | The USA FREEDOM Act | Ends bulk collection of domestic telephone metadata under Section 215, requires the FISA Court to appoint outside amici in novel cases, and mandates declassification of significant opinions.
2024 | statute | RISAA reauthorizes §702 | The Reforming Intelligence and Securing America Act extends Section 702 for two years, adds query training and accountability requirements for FBI personnel, and declines to impose a general warrant requirement.
2026 | statute | Section 702 lapses | After a series of short extensions, the statutory authority expires on 12 June 2026 with no reauthorization in place. Collection continues under FISA Court certifications approved in March 2026 and valid into March 2027.
```

## Section 702 lapsed in June 2026, and collection continued {#live nav="Section 702" .dark}

[Fast-moving · verify before relying on this]{.flag}

Section 702 is the authority that lets the NSA compel American communications providers to hand over the messages of foreign targets abroad. It is also where Americans’ communications enter the system incidentally, which is why every reauthorization becomes a fight about the FBI’s ability to query what has already been collected.

Congress reauthorized it in April 2024 through the Reforming Intelligence and Securing America Act, with a two-year sunset. That sunset arrived in April 2026 and was pushed back by a series of short extensions while negotiations continued. The statutory authority expired at midnight on 12 June 2026 without a new reauthorization.

Collection did not stop. Section 702 runs on annual certifications approved by the FISA Court, and the certifications approved in March 2026 remain valid into March 2027. The lapse ended the government’s ability to issue new certifications; it did not switch off the programs operating under existing ones.

That gap between the statute and the certifications is what makes the current moment unusual. It also means the practical deadline for Congress is the certification expiry, not the sunset date that already passed.

```stats
Label | Value
Statutory authority | Lapsed 12 June 2026
FISC certifications | Valid into March 2027
Reauthorization | Under debate, none enacted
```

Status as of late August 2026, drawn from the Brennan Center’s Section 702 resource page and contemporaneous reporting. Check a current source before citing this. {.note}

## Five questions on the distinctions that matter {#quiz nav="Quiz"}

```quiz {all="Every one. The distinctions here are the ones that carry the most weight in practice." most="A solid grasp of the structure. The cells worth rereading are the ones about who approves what." few="Worth another pass through the two demos above, which cover every question here."}
1. Which of the three can arrest someone inside the United States?
   - [x] The FBI only
   - [ ] The FBI and the CIA
   - [ ] All three, in a national security case
   - [ ] Whichever agency opened the investigation
   > Arrest authority sits with the FBI alone. The National Security Act expressly denies the CIA police and law-enforcement powers, and the NSA has never had them. A CIA or NSA lead that needs an arrest has to hand the case to the FBI.
2. The NSA targets a foreign official abroad and collects an email they sent to an American in Ohio. What is the status of that email?
   - [ ] Unlawfully collected and required to be destroyed
   - [x] Lawfully collected incidentally, and retained under minimization rules
   - [ ] Lawful only if the FBI obtained a warrant for the American first
   - [ ] Not collected at all, because a filter removes US-person traffic
   > This is incidental collection, and it is lawful under Section 702 because the target was the foreigner, not the American. The email is retained rather than destroyed. The contested question is who may later search that repository for the American, and on what showing.
3. What authority covers most CIA and NSA collection conducted overseas?
   - [ ] FISA Title I orders
   - [x] Executive Order 12333
   - [ ] Title 18 search warrants
   - [ ] The USA FREEDOM Act
   > Executive Order 12333 governs intelligence activity outside the FISA framework, which is most overseas collection. It is a presidential order, not a statute, so no court reviews collection under it and the President can amend its terms.
4. Under Section 702, what does the FISA Court actually approve?
   - [ ] Each individual foreign target, before collection begins
   - [x] Annual certifications and the targeting, minimization, and querying procedures
   - [ ] Nothing — Section 702 operates outside the court
   - [ ] Only queries run by FBI agents
   > The court reviews the program once a year and certifies the procedures. Analysts then select individual targets themselves by applying those procedures. That programmatic rather than individualized approval is the structural feature critics object to.
5. The government wants to target an American living in Berlin for foreign intelligence. What does it need?
   - [ ] Nothing, because collection abroad is unrestricted
   - [ ] An Attorney General finding, with no court involved
   - [x] An individual FISA Court order under Section 704
   - [ ] A Title III criminal wiretap order
   > US-person status travels with the person. Section 704 requires an individualized FISA Court order to target an American abroad, even though collection against the foreign nationals around them needs no court approval at all.
```

## Where this comes from {.sources}

- [50 U.S.C. §3036](https://www.law.cornell.edu/uscode/text/50/3036) — duties of the CIA Director, including the bar on police, subpoena, and law-enforcement powers and internal security functions.
- [Executive Order 12333](https://www.archives.gov/federal-register/codification/executive-order/12333.html) — United States Intelligence Activities, as codified by the National Archives.
- [50 U.S.C. §1881a](https://www.law.cornell.edu/uscode/text/50/1881a) — FISA Section 702, procedures for targeting non-US persons reasonably believed to be located outside the United States.
- [CRS Report R48592](https://www.congress.gov/crs-product/R48592) — FISA Section 702 and the 2024 Reforming Intelligence and Securing America Act.
- [Brennan Center](https://www.brennancenter.org/our-work/research-reports/section-702-foreign-intelligence-surveillance-act-fisa-2026-resource-page) — Section 702 of FISA: 2026 resource page, tracking the sunset and reauthorization debate.
- [Brennan Center](https://www.brennancenter.org/our-work/research-reports/section-702-foreign-intelligence-surveillance-act) — Section 702 of FISA, explained.
- [Electronic Frontier Foundation](https://www.eff.org/deeplinks/2026/06/victory-702-has-expired) — contemporaneous account of the 12 June 2026 expiration.
- [Foreign Intelligence Surveillance Court](https://www.fisc.uscourts.gov/) — composition, rules of procedure, and released opinions.
- [FBI](https://www.fbi.gov/investigate) — published investigative priorities and programs.
- [CIA](https://www.cia.gov/about/) — published mission and organization.
- [NSA](https://www.nsa.gov/about/) — published mission and authorities.
- [9/11 Commission Report](https://www.9-11commission.gov/report/) — on the intelligence-criminal separation known as the wall.

This page describes public US law and published agency roles. It is general information, not legal advice, and it simplifies in places where the underlying rules are contested. Where a claim is time-sensitive it is dated on the page. {.foot}
