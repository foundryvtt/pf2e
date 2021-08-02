import { ActionsPF2e, SkillActionOptions } from "../actions";

export function grapple(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "athletics");
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? "A",
        "PF2E.Actions.Grapple.Title",
        subtitle,
        options.modifiers,
        ["all", checkType, stat, "action:grapple"],
        ["action:grapple"],
        ["attack"],
        checkType,
        options.event,
        (target) => target.fortitude,
        (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.Grapple", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.Grapple", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.Grapple", "failure"),
            ActionsPF2e.note(selector, "PF2E.Actions.Grapple", "criticalFailure"),
        ]
    );
}
