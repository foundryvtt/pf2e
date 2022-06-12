import { ActionMacroHelpers, SkillActionOptions } from "..";

export function swim(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "athletics");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Swim.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:swim"],
        extraOptions: ["action:swim"],
        traits: ["move"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Swim", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Swim", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Swim", "criticalFailure"),
        ],
    });
}
