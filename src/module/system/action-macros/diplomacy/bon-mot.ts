import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";

export function bonMot(options: SkillActionOptions): void {
    const slug = options?.skill ?? "diplomacy";
    const rollOptions = ["action:bon-mot"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.BonMot.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["auditory", "concentrate", "emotion", "linguistic", "mental"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.will,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.BonMot", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.BonMot", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.BonMot", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}
