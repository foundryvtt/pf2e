import { ActionsPF2e, SkillActionOptions } from "../actions";

export function climb(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "athletics");
    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Climb.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:climb"],
        extraOptions: ["action:climb"],
        traits: ["move"],
        checkType,
        event: options.event,
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.Climb", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.Climb", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.Climb", "criticalFailure"),
        ],
    });
}
