import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";

export function senseMotive(options: SkillActionOptions) {
    const slug = options?.skill ?? "perception";
    const rollOptions = ["action:sense-motive"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.SenseMotive.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["concentrate", "secret"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.skills.deception,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.SenseMotive", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.SenseMotive", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.SenseMotive", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.SenseMotive", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}
