import { ActionMacros, SkillActionOptions } from "..";

export function senseMotive(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacros.resolveStat(options?.skill ?? "perception");
    ActionMacros.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.SenseMotive.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:sense-motive"],
        extraOptions: ["action:sense-motive"],
        traits: ["concentrate", "secret"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.deception,
        extraNotes: (selector: string) => [
            ActionMacros.note(selector, "PF2E.Actions.SenseMotive", "criticalSuccess"),
            ActionMacros.note(selector, "PF2E.Actions.SenseMotive", "success"),
            ActionMacros.note(selector, "PF2E.Actions.SenseMotive", "failure"),
            ActionMacros.note(selector, "PF2E.Actions.SenseMotive", "criticalFailure"),
        ],
    });
}
