import { ActionMacroHelpers, SkillActionOptions } from "../../index.ts";

export function tamper(options: SkillActionOptions): void {
    const slug = options?.skill ?? "crafting";
    const rollOptions = ["action:tamper"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Tamper.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["inventor", "manipulate"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.reflex,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Tamper", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Tamper", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Tamper", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}
