import { ActionsPF2e, SkillActionOptions } from "../actions";

export function feint(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "deception");
    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Feint.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:feint"],
        extraOptions: ["action:feint"],
        traits: ["mental"],
        checkType,
        event: options.event,
        difficultyClassStatistic: (target) => target.perception,
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.Feint", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.Feint", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.Feint", "criticalFailure"),
        ],
    });
}
