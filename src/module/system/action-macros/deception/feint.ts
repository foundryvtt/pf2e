import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";

export function feint(options: SkillActionOptions): void {
    const slug = options?.skill ?? "deception";
    const rollOptions = ["action:feint"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Feint.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["mental"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.perception,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Feint", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Feint", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Feint", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}
