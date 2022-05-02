import { ActionMacros, SkillActionOptions } from "..";

export function feint(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacros.resolveStat(options?.skill ?? "deception");
    ActionMacros.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Feint.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:feint"],
        extraOptions: ["action:feint"],
        traits: ["mental"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.perception,
        extraNotes: (selector: string) => [
            ActionMacros.note(selector, "PF2E.Actions.Feint", "criticalSuccess"),
            ActionMacros.note(selector, "PF2E.Actions.Feint", "success"),
            ActionMacros.note(selector, "PF2E.Actions.Feint", "criticalFailure"),
        ],
    });
}
