import { ActionMacros, SkillActionOptions } from "..";

export function maneuverInFlight(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacros.resolveStat(options?.skill ?? "acrobatics");
    ActionMacros.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.ManeuverInFlight.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:maneuver-in-flight"],
        extraOptions: ["action:maneuver-in-flight"],
        traits: ["move"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacros.note(selector, "PF2E.Actions.ManeuverInFlight", "success"),
            ActionMacros.note(selector, "PF2E.Actions.ManeuverInFlight", "failure"),
            ActionMacros.note(selector, "PF2E.Actions.ManeuverInFlight", "criticalFailure"),
        ],
    });
}
