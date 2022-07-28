import { ActionMacroHelpers, SkillActionOptions } from "..";

export function longJump(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "athletics");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "D",
        title: "PF2E.Actions.LongJump.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:stride", "action:leap", "action:long-jump"],
        extraOptions: ["action:stride", "action:leap", "action:long-jump"],
        traits: ["move"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.LongJump", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.LongJump", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.LongJump", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.LongJump", "criticalFailure"),
        ],
    });
}
