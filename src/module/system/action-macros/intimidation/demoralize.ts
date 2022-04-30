import { ActionMacros, SkillActionOptions } from "..";

export function demoralize(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacros.resolveStat(options?.skill ?? "intimidation");
    ActionMacros.simpleRollActionCheck({
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
            ActionMacros.note(selector, "PF2E.Actions.Demoralize", "criticalSuccess"),
            ActionMacros.note(selector, "PF2E.Actions.Demoralize", "success"),
        ],
    });
}
