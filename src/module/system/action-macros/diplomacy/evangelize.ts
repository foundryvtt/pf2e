import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "PF2E.Actions.Evangelize";

const action = new SingleCheckAction({
    description: `${PREFIX}.Description`,
    difficultyClass: "will",
    name: `${PREFIX}.Title`,
    notes: [
        { outcome: ["criticalSuccess", "success"], text: `${PREFIX}.Notes.criticalSuccess` },
        { outcome: ["success"], text: `${PREFIX}.Notes.success` },
        { outcome: ["failure"], text: `${PREFIX}.Notes.failure` },
    ],
    rollOptions: ["action:evangelize"],
    section: "skill",
    slug: "evangelize",
    statistic: "diplomacy",
    traits: ["auditory", "linguistic", "mental"],
});

export { action };
