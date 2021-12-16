import { ActionsPF2e, SkillActionOptions } from "../actions";

export function shove(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "athletics");
    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Shove.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:shove"],
        extraOptions: ["action:shove"],
        traits: ["attack"],
        checkType,
        event: options.event,
        difficultyClassStatistic: (target) => target.saves.fortitude,
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.Shove", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.Shove", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.Shove", "criticalFailure"),
        ],
    });
}
