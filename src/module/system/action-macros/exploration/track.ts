import { ActionMacros, SkillActionOptions } from "..";

export function track(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacros.resolveStat(options?.skill ?? "survival");

    ActionMacros.simpleRollActionCheck({
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
            ActionMacros.note(selector, "PF2E.Actions.Track", "success"),
            ActionMacros.note(selector, "PF2E.Actions.Track", "failure"),
            ActionMacros.note(selector, "PF2E.Actions.Track", "criticalFailure"),
        ],
    });
}
