import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "PF2E.Actions.Hack";

const hack = new SingleCheckAction({
    description: `${PREFIX}.Description`,
    name: `${PREFIX}.Title`,
    notes: [
        { outcome: ["criticalSuccess"], text: `${PREFIX}.Notes.criticalSuccess` },
        { outcome: ["success"], text: `${PREFIX}.Notes.success` },
        { outcome: ["failure"], text: `${PREFIX}.Notes.failure` },
        { outcome: ["criticalFailure"], text: `${PREFIX}.Notes.criticalFailure` },
    ],
    rollOptions: ["action:hack"],
    section: "skill",
    slug: "hack",
    statistic: "computers",
    traits: ["exploration"],
});

export { hack };
