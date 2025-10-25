import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "PF2E.Actions.IdentifyAlchemy";

const action = new SingleCheckAction({
    description: `${PREFIX}.Description`,
    name: `${PREFIX}.Title`,
    notes: [
        { outcome: ["criticalSuccess", "success"], text: `${PREFIX}.Notes.success` },
        { outcome: ["failure"], text: `${PREFIX}.Notes.failure` },
        { outcome: ["criticalFailure"], text: `${PREFIX}.Notes.criticalFailure` },
    ],
    section: "skill",
    slug: "identify-alchemy",
    statistic: "crafting",
    traits: ["concentrate", "exploration", "secret"],
});

export { action as identifyAlchemy };
