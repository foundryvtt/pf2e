import { ActionsPF2e, SkillActionOptions } from "../actions";

export function impersonate(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "deception");
    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.Impersonate.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:impersonate"],
        extraOptions: ["action:impersonate"],
        traits: ["concentrate", "exploration", "manipulate", "secret"],
        checkType,
        event: options.event,
        difficultyClassStatistic: (target) => target.perception,
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.Impersonate", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.Impersonate", "failure"),
            ActionsPF2e.note(selector, "PF2E.Actions.Impersonate", "criticalFailure"),
        ],
    });
}
