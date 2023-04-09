import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { ModifierPF2e } from "@actor/modifiers.ts";

const PREFIX = "PF2E.Actions.Steal";

export function steal(options: SkillActionOptions): void {
    const modifiers = [
        new ModifierPF2e({
            label: "PF2E.Actions.Steal.Pocketed",
            modifier: -5,
            predicate: ["action:steal:pocketed"],
        }),
    ].concat(options?.modifiers ?? []);
    const slug = options?.skill ?? "thievery";
    const rollOptions = ["action:steal"];
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: `${PREFIX}.Title`,
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["manipulate"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.perception,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.outcomesNote(selector, `${PREFIX}.Notes.success`, ["success", "criticalSuccess"]),
            ActionMacroHelpers.outcomesNote(selector, `${PREFIX}.Notes.failure`, ["failure", "criticalFailure"]),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}
