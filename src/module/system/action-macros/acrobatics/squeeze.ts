import { ActionMacroHelpers, SkillActionOptions } from "..";

export function squeeze(options: SkillActionOptions) {
    const slug = options?.skill ?? "acrobatics";
    const rollOptions = ["action:squeeze"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.Squeeze.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["exploration", "move"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Squeeze", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Squeeze", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Squeeze", "criticalFailure"),
        ],
    });
}
