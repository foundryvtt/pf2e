import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { SingleCheckAction } from "@actor/actions/index.ts";
import { ModifierPF2e } from "@actor/modifiers.js";

function demoralize(options: SkillActionOptions): void {
    const slug = options?.skill ?? "intimidation";
    const rollOptions = ["action:demoralize"];
    const modifiers = [
        new ModifierPF2e({
            label: "PF2E.Actions.Demoralize.Unintelligible",
            modifier: -4,
            predicate: ["action:demoralize:unintelligible"],
            type: "circumstance",
        }),
    ].concat(options?.modifiers ?? []);
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Demoralize.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["auditory", "concentrate", "emotion", "fear", "mental"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.will,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Demoralize", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Demoralize", "success"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

const action = new SingleCheckAction({
    description: "PF2E.Actions.Demoralize.Description",
    difficultyClass: "saves.will",
    modifiers: [
        {
            label: "PF2E.Actions.Demoralize.Unintelligible",
            modifier: -4,
            predicate: ["action:demoralize:unintelligible"],
            type: "circumstance",
        },
    ],
    name: "PF2E.Actions.Demoralize.Title",
    notes: [
        { outcome: ["criticalSuccess"], text: "PF2E.Actions.Demoralize.Notes.criticalSuccess" },
        { outcome: ["success"], text: "PF2E.Actions.Demoralize.Notes.success" },
    ],
    rollOptions: ["action:demoralize"],
    slug: "demoralize",
    statistic: "intimidation",
    traits: ["auditory", "concentrate", "emotion", "fear", "mental"],
});

export { demoralize as legacy, action };
