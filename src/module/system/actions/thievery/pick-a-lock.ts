import { ActionsPF2e, SkillActionOptions } from "../actions";

export function pickALock(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "thievery");
    ActionsPF2e.simpleRollActionCheck({
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
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.PickALock", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.PickALock", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.PickALock", "criticalFailure"),
        ],
    });
}
