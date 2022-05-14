import { ActionMacros, SkillActionOptions } from "..";

export function longJump(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacros.resolveStat(options?.skill ?? "athletics");
    ActionMacros.simpleRollActionCheck({
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
            ActionMacros.note(selector, "PF2E.Actions.LongJump", "success"),
            ActionMacros.note(selector, "PF2E.Actions.LongJump", "failure"),
            ActionMacros.note(selector, "PF2E.Actions.LongJump", "criticalFailure"),
        ],
    });
}
