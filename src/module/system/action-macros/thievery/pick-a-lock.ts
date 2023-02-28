import { ActionMacroHelpers, SkillActionOptions } from "..";

export function pickALock(options: SkillActionOptions) {
    const slug = options?.skill ?? "thievery";
    const rollOptions = ["action:pick-a-lock"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "D",
        title: "PF2E.Actions.PickALock.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["manipulate"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.PickALock", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.PickALock", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.PickALock", "criticalFailure"),
        ],
    });
}
