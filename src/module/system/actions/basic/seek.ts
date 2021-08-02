import { ActionsPF2e, SkillActionOptions } from "../actions";

export function seek(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "perception");
    ActionsPF2e.simpleRollActionCheck(
        options.actors,
        property,
        options.glyph ?? "A",
        "PF2E.Actions.Seek.Title",
        subtitle,
        options.modifiers,
        ["all", checkType, stat, "action:seek"],
        ["action:seek"],
        ["concentrate", "secret"],
        checkType,
        options.event,
        undefined,
        (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.Seek", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.Seek", "success"),
        ]
    );
}
