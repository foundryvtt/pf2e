import { ActionMacroHelpers, SkillActionOptions } from "../..";

export function tamper(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "crafting");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Tamper.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:tamper"],
        extraOptions: ["action:tamper"],
        traits: ["inventor", "manipulate"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.reflex,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Tamper", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Tamper", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Tamper", "criticalFailure"),
        ],
    });
}
