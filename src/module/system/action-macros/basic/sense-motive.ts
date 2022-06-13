import { ActionMacroHelpers, SkillActionOptions } from "..";

export function senseMotive(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "perception");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.SenseMotive.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:sense-motive"],
        extraOptions: ["action:sense-motive"],
        traits: ["concentrate", "secret"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.skills.deception,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.SenseMotive", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.SenseMotive", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.SenseMotive", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.SenseMotive", "criticalFailure"),
        ],
    });
}
