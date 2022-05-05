import { ActionMacros, SkillActionOptions } from "..";

export function pickALock(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacros.resolveStat(options?.skill ?? "thievery");
    ActionMacros.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "D",
        title: "PF2E.Actions.PickALock.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:pick-a-lock"],
        extraOptions: ["action:pick-a-lock"],
        traits: ["manipulate"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacros.note(selector, "PF2E.Actions.PickALock", "criticalSuccess"),
            ActionMacros.note(selector, "PF2E.Actions.PickALock", "success"),
            ActionMacros.note(selector, "PF2E.Actions.PickALock", "criticalFailure"),
        ],
    });
}
