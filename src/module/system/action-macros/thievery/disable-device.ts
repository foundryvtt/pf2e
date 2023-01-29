import { ActionMacroHelpers, SkillActionOptions } from "..";

export function disableDevice(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "thievery");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "D",
        title: "PF2E.Actions.DisableDevice.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:disable-device"],
        extraOptions: ["action:disable-device"],
        traits: ["manipulate"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.DisableDevice", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.DisableDevice", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.DisableDevice", "criticalFailure"),
        ],
    });
}
