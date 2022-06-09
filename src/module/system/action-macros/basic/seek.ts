import { ActionMacroHelpers, SkillActionOptions } from "..";

export function seek(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "perception");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Seek.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:seek"],
        extraOptions: ["action:seek"],
        traits: ["concentrate", "secret"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Seek", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Seek", "success"),
        ],
    });
}
