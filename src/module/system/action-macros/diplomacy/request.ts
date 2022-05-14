import { ActionMacros, SkillActionOptions } from "..";

export function request(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacros.resolveStat(options?.skill ?? "diplomacy");
    ActionMacros.simpleRollActionCheck({
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
            ActionMacros.note(selector, "PF2E.Actions.Request", "criticalSuccess"),
            ActionMacros.note(selector, "PF2E.Actions.Request", "success"),
            ActionMacros.note(selector, "PF2E.Actions.Request", "failure"),
            ActionMacros.note(selector, "PF2E.Actions.Request", "criticalFailure"),
        ],
    });
}
