import { ActionsPF2e, SkillActionOptions } from "../actions";

export function grapple(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "athletics");
    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Grapple.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:grapple"],
        extraOptions: ["action:grapple"],
        traits: ["attack"],
        checkType,
        event: options.event,
        difficultyClassStatistic: (target) => target.saves.fortitude,
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.Grapple", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.Grapple", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.Grapple", "failure"),
            ActionsPF2e.note(selector, "PF2E.Actions.Grapple", "criticalFailure"),
        ],
    });
}
