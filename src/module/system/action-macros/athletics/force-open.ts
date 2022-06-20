import { ActionMacroHelpers, SkillActionOptions } from "..";

export function forceOpen(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "athletics");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.ForceOpen.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:force-open"],
        extraOptions: ["action:force-open"],
        traits: ["attack"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.ForceOpen", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.ForceOpen", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.ForceOpen", "criticalFailure"),
        ],
    });
}
