import { ActionMacroHelpers, SkillActionOptions } from "..";

export function revealMachinations(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "deception");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.RevealMachinations.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:reveal-machinations"],
        extraOptions: ["action:reveal-machinations"],
        traits: [],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.will,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.RevealMachinations", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.RevealMachinations", "success"),
        ],
    });
}
