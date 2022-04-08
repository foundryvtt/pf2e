import { ActionMacros, SkillActionOptions } from "..";

export function hide(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacros.resolveStat(options?.skill ?? "stealth");
    ActionMacros.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Hide.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:hide"],
        extraOptions: ["action:hide"],
        traits: ["secret"],
        checkType,
        event: options.event,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.perception,
        extraNotes: (selector: string) => [ActionMacros.note(selector, "PF2E.Actions.Hide", "success")],
    });
}
