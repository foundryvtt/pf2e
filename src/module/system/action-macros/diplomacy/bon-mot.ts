import { ActionMacros, SkillActionOptions } from "..";

export function bonMot(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacros.resolveStat(options?.skill ?? "diplomacy");
    ActionMacros.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.BonMot.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:bon-mot"],
        extraOptions: ["action:bon-mot"],
        traits: ["auditory", "concentrate", "emotion", "linguistic", "mental"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.will,
        extraNotes: (selector: string) => [
            ActionMacros.note(selector, "PF2E.Actions.BonMot", "criticalSuccess"),
            ActionMacros.note(selector, "PF2E.Actions.BonMot", "success"),
            ActionMacros.note(selector, "PF2E.Actions.BonMot", "criticalFailure"),
        ],
    });
}
