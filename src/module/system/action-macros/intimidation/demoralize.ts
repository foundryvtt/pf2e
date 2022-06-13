import { ActionMacroHelpers, SkillActionOptions } from "..";

export function demoralize(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "intimidation");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Demoralize.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:demoralize"],
        extraOptions: ["action:demoralize"],
        traits: ["auditory", "concentrate", "emotion", "fear", "mental"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.will,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Demoralize", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Demoralize", "success"),
        ],
    });
}
