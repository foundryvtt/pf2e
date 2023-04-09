import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";

export function request(options: SkillActionOptions): void {
    const slug = options?.skill ?? "diplomacy";
    const rollOptions = ["action:request"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Request.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["auditory", "concentrate", "linguistic", "mental"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Request", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Request", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Request", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Request", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}
