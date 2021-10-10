import { ActionsPF2e, SkillActionOptions } from "../actions";

export function balance(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "acrobatics");
    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Balance.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:balance"],
        extraOptions: ["action:balance"],
        traits: ["move"],
        checkType,
        event: options.event,
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.Balance", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.Balance", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.Balance", "failure"),
            ActionsPF2e.note(selector, "PF2E.Actions.Balance", "criticalFailure"),
        ],
    });
}
