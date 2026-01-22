import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "PF2E.Actions.TakeControl";

// @todo this action is present in pf2e as well but requires special handling
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
