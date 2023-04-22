import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";

export function track(options: SkillActionOptions): void {
    const slug = options?.skill ?? "survival";
    const rollOptions = ["action:track"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.Track.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["concentrate", "exploration", "move"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Track", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Track", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Track", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Track", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}
