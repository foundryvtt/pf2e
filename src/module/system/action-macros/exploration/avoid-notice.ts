import { ActionMacroHelpers, SkillActionOptions } from "..";

export function avoidNotice(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "stealth");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.AvoidNotice.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:avoid-notice"],
        extraOptions: ["action:avoid-notice"],
        traits: ["exploration"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.AvoidNotice", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.AvoidNotice", "success"),
        ],
    });
}
