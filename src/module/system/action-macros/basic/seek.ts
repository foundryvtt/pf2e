import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";

export function seek(options: SkillActionOptions): void {
    const slug = options?.skill ?? "perception";
    const rollOptions = ["action:seek"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Seek.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["concentrate", "secret"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Seek", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Seek", "success"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}
