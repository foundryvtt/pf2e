import { ActionMacroHelpers, SkillActionOptions } from "..";
import { ModifierPF2e } from "@actor/modifiers";

export function subsist(options: SkillActionOptions) {
    if (!options?.skill) {
        ui.notifications.warn(game.i18n.localize("PF2E.Actions.Subsist.Warning.NoSkill"));
        return;
    }
    const modifiers = [
        new ModifierPF2e({
            label: "PF2E.Actions.Subsist.AfterExplorationPenalty",
            modifier: -5,
            predicate: ["action:subsist:after-exploration"],
        }),
    ].concat(options?.modifiers ?? []);
    const { skill: slug } = options;
    const rollOptions = ["action:subsist", `action:subsist:${slug}`];
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.Subsist.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["downtime"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Subsist", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Subsist", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Subsist", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Subsist", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}
