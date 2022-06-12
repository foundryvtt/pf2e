import { ActionMacroHelpers, SkillActionOptions } from "..";

export function squeeze(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "acrobatics");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.Squeeze.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:squeeze"],
        extraOptions: ["action:squeeze"],
        traits: ["exploration", "move"],
        checkType,
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
