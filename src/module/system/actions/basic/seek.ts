import { ActionsPF2e, SkillActionOptions } from "../actions";

export function seek(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "perception");
    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Seek.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:seek"],
        extraOptions: ["action:seek"],
        traits: ["concentrate", "secret"],
        checkType,
        event: options.event,
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.Seek", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.Seek", "success"),
        ],
    });
}
