import { ActionMacroHelpers, SkillActionOptions } from "..";

export function battlePrayer(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "religion");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.BattlePrayer.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:battle-prayer"],
        extraOptions: ["action:battle-prayer"],
        traits: ["divine"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.will,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.BattlePrayer", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.BattlePrayer", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.BattlePrayer", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.BattlePrayer", "criticalFailure"),
        ],
    });
}
