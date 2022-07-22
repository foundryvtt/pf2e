import { ActionMacroHelpers, SkillActionOptions } from "..";

export function lie(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "deception");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.Lie.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:lie"],
        extraOptions: ["action:lie"],
        traits: ["auditory", "concentrate", "linguistic", "mental", "secret"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.perception,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Lie", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Lie", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Lie", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Lie", "criticalFailure"),
        ],
    });
}
