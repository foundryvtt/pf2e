import { ActionMacroHelpers, SkillActionOptions } from "..";
import { ModifierPF2e } from "@actor/modifiers";

export function steal(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "thievery");
    const modifiers = [
        new ModifierPF2e({
            label: "PF2E.Actions.Steal.Pocketed",
            modifier: -5,
            predicate: ["action:steal:pocketed"],
        }),
    ];
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Steal.Title",
        subtitle,
        modifiers: modifiers.concat(options.modifiers ?? []),
        rollOptions: ["all", checkType, stat, "action:steal"],
        extraOptions: ["action:steal"],
        traits: ["manipulate"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.perception,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Steal", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Steal", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Steal", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Steal", "criticalFailure"),
        ],
    });
}
