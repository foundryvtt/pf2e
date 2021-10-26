import { ActionsPF2e, SkillActionOptions } from "../actions";

export function maneuverInFlight(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "acrobatics");
    ActionsPF2e.simpleRollActionCheck({
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
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.ManeuverInFlight", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.ManeuverInFlight", "failure"),
            ActionsPF2e.note(selector, "PF2E.Actions.ManeuverInFlight", "criticalFailure"),
        ],
    });
}
