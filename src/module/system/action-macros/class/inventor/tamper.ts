import { ActionMacros, SkillActionOptions } from "../..";

export function tamper(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacros.resolveStat(options?.skill ?? "crafting");
    ActionMacros.simpleRollActionCheck({
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
            ActionMacros.note(selector, "PF2E.Actions.Tamper", "criticalSuccess"),
            ActionMacros.note(selector, "PF2E.Actions.Tamper", "success"),
            ActionMacros.note(selector, "PF2E.Actions.Tamper", "criticalFailure"),
        ],
    });
}
