import { ActionMacroHelpers, SkillActionOptions } from "..";

export function scareToDeath(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "intimidation");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.ScareToDeath.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:scare-to-death"],
        extraOptions: ["action:scare-to-death"],
        traits: ["emotion", "fear", "incapacitation", "mental"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.will,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.ScareToDeath", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.ScareToDeath", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.ScareToDeath", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.ScareToDeath", "criticalFailure"),        ],
    });
}
