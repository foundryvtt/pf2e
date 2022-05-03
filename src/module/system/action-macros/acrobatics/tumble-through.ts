import { ActionMacros, SkillActionOptions } from "..";

export function tumbleThrough(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacros.resolveStat(options?.skill ?? "acrobatics");
    ActionMacros.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.TumbleThrough.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:tumble-through"],
        extraOptions: ["action:tumble-through"],
        traits: ["move"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.reflex,
        extraNotes: (selector: string) => [
            ActionMacros.note(selector, "PF2E.Actions.TumbleThrough", "success"),
            ActionMacros.note(selector, "PF2E.Actions.TumbleThrough", "failure"),
        ],
    });
}
