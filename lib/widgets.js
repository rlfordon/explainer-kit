/* widgets.js — the registry. A widget is a fence language with a render(block, ctx) → HTML.
 * Its stylesheet is widgets/css/<name>.css (static ones share static.css) and, when it
 * needs a script, widgets/run/<name>.js exports a function of the same name that takes the
 * rendered root element ([data-w=<name>]). */
import { cards, stats, callout, deeper, myths, glossary } from "../widgets/static.js";
import { timeline } from "../widgets/timeline.js";
import { stepper } from "../widgets/stepper.js";
import { router } from "../widgets/router.js";
import { tree } from "../widgets/tree.js";
import { quiz } from "../widgets/quiz.js";
import { checklist } from "../widgets/checklist.js";

export const WIDGETS = { cards, stats, callout, deeper, myths, glossary, timeline, stepper, router, tree, quiz, checklist };

/* widgets with a runtime script */
export const RUNTIME = ["timeline", "stepper", "router", "tree", "quiz", "checklist"];

/* widgets whose CSS lives in static.css */
export const STATIC = ["cards", "stats", "callout", "deeper", "myths", "glossary"];
