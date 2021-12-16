import { ActionsPF2e, SkillActionOptions } from "../actions";

export function disarm(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "athletics");
    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Disarm.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:disarm"],
        extraOptions: ["action:disarm"],
        traits: ["attack"],
        checkType,
        event: options.event,
        difficultyClassStatistic: (target) => target.saves.reflex,
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.Disarm", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.Disarm", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.Disarm", "criticalFailure"),
        ],
    });
}
