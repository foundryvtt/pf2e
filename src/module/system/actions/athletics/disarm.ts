import { ActionsPF2e, SkillActionOptions } from "../actions";

export function disarm(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "athletics");
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? "A",
        "PF2E.Actions.Disarm.Title",
        subtitle,
        options.modifiers,
        ["all", checkType, stat, "action:disarm"],
        ["action:disarm"],
        ["attack"],
        checkType,
        options.event,
        (target) => target.reflex,
        (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.Disarm", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.Disarm", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.Disarm", "criticalFailure"),
        ]
    );
}
