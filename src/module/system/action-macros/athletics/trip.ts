import { ActionMacros, SkillActionOptions } from "..";

export function trip(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacros.resolveStat(options?.skill ?? "athletics");
    ActionMacros.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Trip.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:trip"],
        extraOptions: ["action:trip"],
        traits: ["attack"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.reflex,
        extraNotes: (selector: string) => [
            ActionMacros.note(selector, "PF2E.Actions.Trip", "criticalSuccess"),
            ActionMacros.note(selector, "PF2E.Actions.Trip", "success"),
            ActionMacros.note(selector, "PF2E.Actions.Trip", "criticalFailure"),
        ],
        weaponTrait: "trip",
        weaponTraitWithPenalty: "ranged-trip",
    });
}
