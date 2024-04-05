import { SingleCheckAction } from "@actor/actions/index.ts";

const arrestAFall = new SingleCheckAction({
    cost: "reaction",
    description: "PF2E.Actions.ArrestAFall.Description",
    difficultyClass: { value: 15 },
    name: "PF2E.Actions.ArrestAFall.Title",
    notes: [{ outcome: ["success", "criticalSuccess"], text: "PF2E.Actions.ArrestAFall.Notes.success" }],
    rollOptions: ["action:arrest-a-fall"],
    section: "specialty-basic",
    slug: "arrest-a-fall",
    statistic: ["reflex", "acrobatics"],
});

export { arrestAFall };
