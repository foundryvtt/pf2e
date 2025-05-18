import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "SF2E.Actions.RunOver";

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
