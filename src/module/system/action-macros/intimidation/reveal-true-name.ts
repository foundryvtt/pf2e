import { ActionMacroHelpers, SkillActionOptions } from "..";

export function revealTrueName(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "intimidation");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.RevealTrueName.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:reveal-true-name"],
        extraOptions: ["action:reveal-true-name"],
        traits: ["auditory", "concentrate", "emotion", "mental", "true name"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.will,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.RevealTrueName", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.RevealTrueName", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.RevealTrueName", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.RevealTrueName", "criticalFailure"),
        ],
    });
}
