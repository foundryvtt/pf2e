import { ActionsPF2e, SkillActionOptions } from "../actions";

export function forceOpen(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "athletics");
    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.ForceOpen.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:force-open"],
        extraOptions: ["action:force-open"],
        traits: ["attack"],
        checkType,
        event: options.event,
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.ForceOpen", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.ForceOpen", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.ForceOpen", "criticalFailure"),
        ],
    });
}
