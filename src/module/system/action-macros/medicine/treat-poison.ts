import { ActionMacroHelpers, SkillActionOptions } from "..";

export function treatPoison(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "medicine");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.TreatPoison.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:treat-poison"],
        extraOptions: ["action:treat-poison"],
        traits: ["manipulate"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.TreatPoison", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.TreatPoison", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.TreatPoison", "criticalFailure"),
        ],
    });
}
