import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "PF2E.Actions.RunOver";

// @todo this action is present in pf2e as well but requires special handling
const runOver = new SingleCheckAction({
    cost: 3,
    description: `${PREFIX}.Description`,
    name: `${PREFIX}.Title`,
    notes: [{ outcome: ["criticalFailure", "failure"], text: `${PREFIX}.Notes.failure` }],
    rollOptions: ["action:run-over"],
    section: "skill",
    slug: "run-over",
    statistic: "piloting",
    traits: ["move", "reckless"],
});

export { runOver };
