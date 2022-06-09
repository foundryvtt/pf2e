import { ActionMacroHelpers, SkillActionOptions } from "..";

export function coerce(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "intimidation");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.Coerce.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:coerce"],
        extraOptions: ["action:coerce"],
        traits: ["auditory", "concentrate", "emotion", "exploration", "linguistic", "mental"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.will,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Coerce", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Coerce", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Coerce", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Coerce", "criticalFailure"),
        ],
    });
}
