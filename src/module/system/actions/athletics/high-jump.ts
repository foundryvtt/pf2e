import { ActionsPF2e, SkillActionOptions } from "../actions";

export function highJump(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "athletics");
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? "D",
        "PF2E.Actions.HighJump.Title",
        subtitle,
        options.modifiers,
        ["all", checkType, stat, "action:stride", "action:leap", "action:high-jump"],
        ["action:stride", "action:leap", "action:high-jump"],
        ["move"],
        checkType,
        options.event,
        undefined,
        (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.HighJump", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.HighJump", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.HighJump", "failure"),
            ActionsPF2e.note(selector, "PF2E.Actions.HighJump", "criticalFailure"),
        ]
    );
}
