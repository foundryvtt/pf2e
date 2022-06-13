import { ActionMacroHelpers, SkillActionOptions } from "..";

export function grapple(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "athletics");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Grapple.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:grapple"],
        extraOptions: ["action:grapple"],
        traits: ["attack"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.fortitude,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Grapple", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Grapple", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Grapple", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Grapple", "criticalFailure"),
        ],
        weaponTrait: "grapple",
    });
}
