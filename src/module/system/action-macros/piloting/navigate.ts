import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "PF2E.Actions.Navigate";

const navigate = new SingleCheckAction({
    description: `${PREFIX}.Description`,
    name: `${PREFIX}.Title`,
    notes: [
        { outcome: ["criticalSuccess"], text: `${PREFIX}.Notes.criticalSuccess` },
        { outcome: ["success"], text: `${PREFIX}.Notes.success` },
    ],
    rollOptions: ["action:navigate"],
    section: "skill",
    slug: "navigate",
    statistic: "piloting",
    traits: ["exploration", "secret"],
});

export { navigate };
