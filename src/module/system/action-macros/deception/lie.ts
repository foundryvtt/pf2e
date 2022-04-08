import { ActionMacros, SkillActionOptions } from "..";

export function lie(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacros.resolveStat(options?.skill ?? "deception");
    ActionMacros.simpleRollActionCheck({
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
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.perception,
        extraNotes: (selector: string) => [
            ActionMacros.note(selector, "PF2E.Actions.Lie", "success"),
            ActionMacros.note(selector, "PF2E.Actions.Lie", "failure"),
        ],
    });
}
