import { ActionMacroHelpers, SkillActionOptions } from "..";

export function highJump(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "athletics");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "D",
        title: "PF2E.Actions.HighJump.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:stride", "action:leap", "action:high-jump"],
        extraOptions: ["action:stride", "action:leap", "action:high-jump"],
        traits: ["move"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.HighJump", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.HighJump", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.HighJump", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.HighJump", "criticalFailure"),
        ],
    });
}
