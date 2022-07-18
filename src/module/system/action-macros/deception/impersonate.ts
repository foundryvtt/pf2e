import { ActionMacroHelpers, SkillActionOptions } from "..";

export function impersonate(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "deception");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.Impersonate.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:impersonate"],
        extraOptions: ["action:impersonate"],
        traits: ["concentrate", "exploration", "manipulate", "secret"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.perception,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Impersonate", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Impersonate", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Impersonate", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Impersonate", "criticalFailure"),
        ],
    });
}
