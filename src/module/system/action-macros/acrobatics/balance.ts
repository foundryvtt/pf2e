import { ActionMacroHelpers, SkillActionOptions } from "..";

export function balance(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "acrobatics");
    ActionMacroHelpers.simpleRollActionCheck({
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
            ActionMacroHelpers.note(selector, "PF2E.Actions.Balance", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Balance", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Balance", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Balance", "criticalFailure"),
        ],
    });
}
