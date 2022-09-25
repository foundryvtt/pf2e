import { ActionMacroHelpers, SkillActionOptions } from "..";

export function evangelize(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "diplomacy");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Evangelize.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:evangelize"],
        extraOptions: ["action:evangelize"],
        traits: ["auditory", "linguistic", "mental"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.will,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Evangelize", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Evangelize", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Evangelize", "failure"),
        ],
    });
}
