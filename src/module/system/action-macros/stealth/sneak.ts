import { ActionMacros, SkillActionOptions } from "..";

export function sneak(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacros.resolveStat(options?.skill ?? "stealth");
    ActionMacros.simpleRollActionCheck({
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
            ActionMacros.note(selector, "PF2E.Actions.Sneak", "success"),
            ActionMacros.note(selector, "PF2E.Actions.Sneak", "failure"),
            ActionMacros.note(selector, "PF2E.Actions.Sneak", "criticalFailure"),
        ],
    });
}
