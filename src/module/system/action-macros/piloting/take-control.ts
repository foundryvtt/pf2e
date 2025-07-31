import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "SF2E.Actions.TakeControl";

const takeControl = new SingleCheckAction({
    cost: 1,
    description: `${PREFIX}.Description`,
    name: `${PREFIX}.Title`,
    notes: [{ outcome: ["criticalSuccess", "success"], text: `${PREFIX}.Notes.success` }],
    rollOptions: ["action:take-control"],
    section: "skill",
    slug: "take-control",
    statistic: "piloting",
    traits: ["manipulate"],
});

export { takeControl };
