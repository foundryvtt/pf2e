import { ActionMacroHelpers, SkillActionOptions } from "..";

export function request(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "diplomacy");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Request.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:request"],
        extraOptions: ["action:request"],
        traits: ["auditory", "concentrate", "linguistic", "mental"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Request", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Request", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Request", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Request", "criticalFailure"),
        ],
    });
}
