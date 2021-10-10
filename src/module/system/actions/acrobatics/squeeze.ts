import { ActionsPF2e, SkillActionOptions } from "../actions";

export function squeeze(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "acrobatics");
    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.Squeeze.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:squeeze"],
        extraOptions: ["action:squeeze"],
        traits: ["exploration", "move"],
        checkType,
        event: options.event,
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.Squeeze", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.Squeeze", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.Squeeze", "criticalFailure"),
        ],
    });
}
