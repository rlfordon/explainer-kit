/* hydrate.js — every widget runtime, for the viewer (the file target includes only those used). */
import { timeline } from "../widgets/run/timeline.js";
import { stepper } from "../widgets/run/stepper.js";
import { router } from "../widgets/run/router.js";
import { tree } from "../widgets/run/tree.js";
import { quiz } from "../widgets/run/quiz.js";
import { checklist } from "../widgets/run/checklist.js";
import { calc } from "../widgets/run/calc.js";
import { triage } from "../widgets/run/triage.js";
import { catalog } from "../widgets/run/catalog.js";
import { locator } from "../widgets/run/locator.js";
import { splits } from "../widgets/run/splits.js";

export const HYDRATE = { timeline, stepper, router, tree, quiz, checklist, calc, triage, catalog, locator, splits };
