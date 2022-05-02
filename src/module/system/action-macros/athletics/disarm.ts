import { ActionMacros, SkillActionOptions } from "..";

export function disarm(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacros.resolveStat(options?.skill ?? "athletics");
    ActionMacros.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Disarm.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:disarm"],
        extraOptions: ["action:disarm"],
        traits: ["attack"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.reflex,
        extraNotes: (selector: string) => [
            ActionMacros.note(selector, "PF2E.Actions.Disarm", "criticalSuccess"),
            ActionMacros.note(selector, "PF2E.Actions.Disarm", "success"),
            ActionMacros.note(selector, "PF2E.Actions.Disarm", "criticalFailure"),
        ],
        weaponTrait: "disarm",
    });
}
