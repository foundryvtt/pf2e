import { ActionsPF2e, SkillActionOptions } from "../actions";

export function lie(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "deception");
    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.Lie.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:lie"],
        extraOptions: ["action:lie"],
        traits: ["auditory", "concentrate", "linguistic", "mental", "secret"],
        checkType,
        event: options.event,
        difficultyClassStatistic: (target) => target.perception,
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.Lie", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.Lie", "failure"),
        ],
    });
}
