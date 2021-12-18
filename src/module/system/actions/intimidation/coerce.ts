import { ActionsPF2e, SkillActionOptions } from "../actions";

export function coerce(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "intimidation");
    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.Coerce.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:coerce"],
        extraOptions: ["action:coerce"],
        traits: ["auditory", "concentrate", "emotion", "exploration", "linguistic", "mental"],
        checkType,
        event: options.event,
        difficultyClassStatistic: (target) => target.saves.will,
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.Coerce", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.Coerce", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.Coerce", "failure"),
            ActionsPF2e.note(selector, "PF2E.Actions.Coerce", "criticalFailure"),
        ],
    });
}
