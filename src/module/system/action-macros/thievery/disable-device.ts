import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { SingleCheckAction } from "@actor/actions/index.ts";

function disableDevice(options: SkillActionOptions): void {
    const slug = options?.skill ?? "thievery";
    const rollOptions = ["action:disable-a-device", "action:disable-device"];
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

const action = new SingleCheckAction({
    cost: 2,
    description: "PF2E.Actions.DisableDevice.Description",
    name: "PF2E.Actions.DisableDevice.Title",
    notes: [
        { outcome: ["criticalSuccess"], text: "PF2E.Actions.DisableDevice.Notes.criticalSuccess" },
        { outcome: ["success"], text: "PF2E.Actions.DisableDevice.Notes.success" },
        { outcome: ["criticalFailure"], text: "PF2E.Actions.DisableDevice.Notes.criticalFailure" },
    ],
    rollOptions: ["action:disable-a-device", "action:disable-device"],
    slug: "disable-device",
    statistic: "thievery",
    traits: ["manipulate"],
});

export { disableDevice as legacy, action };
