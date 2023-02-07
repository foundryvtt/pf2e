import { ActionMacroHelpers, SkillActionOptions } from "..";

export function concealAnObject(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "stealth");
    return ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.ConcealAnObject.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:conceal-an-object"],
        extraOptions: ["action:conceal-an-object"],
        traits: ["manipulate", "secret"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.perception,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.ConcealAnObject", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.ConcealAnObject", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.ConcealAnObject", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.ConcealAnObject", "criticalFailure"),
        ],
    });
}
