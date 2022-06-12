import { ActionMacroHelpers, SkillActionOptions } from "..";

export function shove(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "athletics");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Shove.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:shove"],
        extraOptions: ["action:shove"],
        traits: ["attack"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.fortitude,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Shove", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Shove", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Shove", "criticalFailure"),
        ],
        weaponTrait: "shove",
    });
}
