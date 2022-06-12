import { ActionMacroHelpers, SkillActionOptions } from "..";

export function makeAnImpression(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "diplomacy");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.MakeAnImpression.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:make-an-impression"],
        extraOptions: ["action:make-an-impression"],
        traits: ["auditory", "concentrate", "exploration", "linguistic", "mental"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.will,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.MakeAnImpression", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.MakeAnImpression", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.MakeAnImpression", "criticalFailure"),
        ],
    });
}
