import { ActionMacroHelpers, SkillActionOptions } from "..";
import { ModifierPF2e } from "@actor/modifiers";

export function subsist(options: SkillActionOptions) {
    if (!options.skill) {
        ui.notifications.warn(game.i18n.localize("PF2E.Actions.Subsist.Warning.NoSkill"));
        return;
    }
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options.skill!);
    const modifiers = [
        new ModifierPF2e({
            label: "PF2E.Actions.Subsist.AfterExplorationPenalty",
            modifier: -5,
            predicate: ["action:subsist:after-exploration"],
        }),
    ];
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.Subsist.Title",
        subtitle,
        modifiers: modifiers.concat(options.modifiers ?? []),
        rollOptions: ["all", checkType, stat, "action:subsist"],
        extraOptions: ["action:subsist"],
        traits: ["downtime"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Subsist", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Subsist", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Subsist", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Subsist", "criticalFailure"),
        ],
    });
}
