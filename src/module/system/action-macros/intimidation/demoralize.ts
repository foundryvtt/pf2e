import { ActionMacroHelpers, SkillActionOptions } from "..";

export function demoralize(options: SkillActionOptions) {
    const slug = options?.skill ?? "intimidation";
    const rollOptions = ["action:demoralize"];
    const modifiers = options?.modifiers;
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
