import { ActionMacroHelpers, SkillActionOptions } from "..";

export function sneak(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "stealth");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Sneak.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:sneak"],
        extraOptions: ["action:sneak"],
        traits: ["move", "secret"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.perception,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Sneak", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Sneak", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Sneak", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Sneak", "criticalFailure"),
        ],
    });
}
