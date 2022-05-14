import { ActionMacros, SkillActionOptions } from "..";

export function highJump(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacros.resolveStat(options?.skill ?? "athletics");
    ActionMacros.simpleRollActionCheck({
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
            ActionMacros.note(selector, "PF2E.Actions.HighJump", "criticalSuccess"),
            ActionMacros.note(selector, "PF2E.Actions.HighJump", "success"),
            ActionMacros.note(selector, "PF2E.Actions.HighJump", "failure"),
            ActionMacros.note(selector, "PF2E.Actions.HighJump", "criticalFailure"),
        ],
    });
}
