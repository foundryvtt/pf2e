import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { SingleCheckAction } from "@actor/actions/index.ts";

function treatPoison(options: SkillActionOptions): void {
    const slug = options?.skill ?? "medicine";
    const rollOptions = ["action:treat-poison"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.TreatPoison.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["manipulate"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.TreatPoison", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.TreatPoison", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.TreatPoison", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

const action = new SingleCheckAction({
    cost: 1,
    description: "PF2E.Actions.TreatPoison.Description",
    name: "PF2E.Actions.TreatPoison.Title",
    notes: [
        { outcome: ["criticalSuccess"], text: "PF2E.Actions.TreatPoison.Notes.criticalSuccess" },
        { outcome: ["success"], text: "PF2E.Actions.TreatPoison.Notes.success" },
        { outcome: ["criticalFailure"], text: "PF2E.Actions.TreatPoison.Notes.criticalFailure" },
    ],
    rollOptions: ["action:treat-poison"],
    slug: "treat-poison",
    statistic: "medicine",
    traits: ["manipulate"],
});

export { treatPoison as legacy, action };
