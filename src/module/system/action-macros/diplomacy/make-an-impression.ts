import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";

export function makeAnImpression(options: SkillActionOptions): void {
    const slug = options?.skill ?? "diplomacy";
    const rollOptions = ["action:make-an-impression"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.MakeAnImpression.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["auditory", "concentrate", "exploration", "linguistic", "mental"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.will,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.MakeAnImpression", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.MakeAnImpression", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.MakeAnImpression", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}
