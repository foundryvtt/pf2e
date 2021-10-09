import { ActionsPF2e, SkillActionOptions } from "../actions";

export function highJump(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "athletics");
    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "D",
        title: "PF2E.Actions.HighJump.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:stride", "action:leap", "action:high-jump"],
        extraOptions: ["action:stride", "action:leap", "action:high-jump"],
        traits: ["move"],
        checkType,
        event: options.event,
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.HighJump", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.HighJump", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.HighJump", "failure"),
            ActionsPF2e.note(selector, "PF2E.Actions.HighJump", "criticalFailure"),
        ],
    });
}
