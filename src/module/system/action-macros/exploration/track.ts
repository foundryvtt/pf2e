import { ActionMacroHelpers, SkillActionOptions } from "..";

export function track(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "survival");

    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.Track.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:track"],
        extraOptions: ["action:track"],
        traits: ["concentrate", "exploration", "move"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Track", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Track", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Track", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Track", "criticalFailure"),
        ],
    });
}
