import { ActionMacroHelpers, SkillActionOptions } from "..";

export function feint(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "deception");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Feint.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:feint"],
        extraOptions: ["action:feint"],
        traits: ["mental"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.perception,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Feint", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Feint", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Feint", "criticalFailure"),
        ],
    });
}
