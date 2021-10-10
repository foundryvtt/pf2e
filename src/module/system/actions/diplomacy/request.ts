import { ActionsPF2e, SkillActionOptions } from "../actions";

export function request(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "diplomacy");
    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Request.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:request"],
        extraOptions: ["action:request"],
        traits: ["auditory", "concentrate", "linguistic", "mental"],
        checkType,
        event: options.event,
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.Request", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.Request", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.Request", "failure"),
            ActionsPF2e.note(selector, "PF2E.Actions.Request", "criticalFailure"),
        ],
    });
}
