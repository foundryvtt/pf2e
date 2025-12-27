import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "PF2E.Actions.AccessInfosphere";

const accessInfosphere = new SingleCheckAction({
    description: `${PREFIX}.Description`,
    name: `${PREFIX}.Title`,
    notes: [
        { outcome: ["criticalSuccess"], text: `${PREFIX}.Notes.criticalSuccess` },
        { outcome: ["success"], text: `${PREFIX}.Notes.success` },
        { outcome: ["criticalFailure"], text: `${PREFIX}.Notes.criticalFailure` },
    ],
    rollOptions: ["action:access-infosphere"],
    section: "skill",
    slug: "access-infosphere",
    statistic: "computers",
    traits: ["concentrate", "exploration", "secret"],
});

export { accessInfosphere };
