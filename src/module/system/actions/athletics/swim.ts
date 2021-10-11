import { ActionsPF2e, SkillActionOptions } from "../actions";

export function swim(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "athletics");
    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Swim.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:swim"],
        extraOptions: ["action:swim"],
        traits: ["move"],
        checkType,
        event: options.event,
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.Swim", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.Swim", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.Swim", "criticalFailure"),
        ],
    });
}
