import { ActionMacroHelpers, SkillActionOptions } from "..";

export function palmAnObject(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "thievery");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.PalmAnObject.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:palm-an-object"],
        extraOptions: ["action:palm-an-object"],
        traits: ["manipulate"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.perception,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.PalmAnObject", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.PalmAnObject", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.PalmAnObject", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.PalmAnObject", "criticalFailure"),
        ],
    });
}
