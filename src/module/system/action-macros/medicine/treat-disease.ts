import { ActionMacroHelpers, SkillActionOptions } from "..";

export function treatDisease(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "medicine");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.TreatDisease.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:treat-disease"],
        extraOptions: ["action:treat-disease"],
        traits: ["downtime", "manipulate"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.TreatDisease", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.TreatDisease", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.TreatDisease", "criticalFailure"),
        ],
    });
}
