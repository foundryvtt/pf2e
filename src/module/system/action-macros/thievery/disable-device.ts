import { ActionMacroHelpers, SkillActionOptions } from "..";

export function disableDevice(options: SkillActionOptions) {
    const slug = options?.skill ?? "thievery";
    const rollOptions = ["action:disable-device"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options?.actors,
        actionGlyph: options?.glyph ?? "D",
        title: "PF2E.Actions.DisableDevice.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["manipulate"],
        event: options?.event,
        callback: options?.callback,
        difficultyClass: options?.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.DisableDevice", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.DisableDevice", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.DisableDevice", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}
