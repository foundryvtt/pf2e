import { ActionsPF2e, SkillActionOptions } from "../actions";

export function senseMotive(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "perception");
    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.SenseMotive.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:sense-motive"],
        extraOptions: ["action:sense-motive"],
        traits: ["concentrate", "secret"],
        checkType,
        event: options.event,
        difficultyClassStatistic: (target) => target.deception,
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.SenseMotive", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.SenseMotive", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.SenseMotive", "failure"),
            ActionsPF2e.note(selector, "PF2E.Actions.SenseMotive", "criticalFailure"),
        ],
    });
}
