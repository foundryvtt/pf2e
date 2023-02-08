import { ActionMacroHelpers, SkillActionOptions } from "..";

const PREFIX = "PF2E.Actions.ManeuverInFlight";

export function maneuverInFlight(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "acrobatics");
    return ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: `${PREFIX}.Title`,
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
            ActionMacroHelpers.outcomesNote(selector, `${PREFIX}.Notes.success`, ["success", "criticalSuccess"]),
            ActionMacroHelpers.note(selector, PREFIX, "failure"),
            ActionMacroHelpers.note(selector, PREFIX, "criticalFailure"),
        ],
    });
}
