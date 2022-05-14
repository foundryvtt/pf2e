import { ActionMacros, SkillActionOptions } from "..";

export function balance(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacros.resolveStat(options?.skill ?? "acrobatics");
    ActionMacros.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Balance.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:balance"],
        extraOptions: ["action:balance"],
        traits: ["move"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacros.note(selector, "PF2E.Actions.Balance", "criticalSuccess"),
            ActionMacros.note(selector, "PF2E.Actions.Balance", "success"),
            ActionMacros.note(selector, "PF2E.Actions.Balance", "failure"),
            ActionMacros.note(selector, "PF2E.Actions.Balance", "criticalFailure"),
        ],
    });
}
