import { ActionsPF2e, SkillActionOptions } from "../actions";

export function gatherInformation(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "diplomacy");
    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.GatherInformation.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:gather-information"],
        extraOptions: ["action:gather-information"],
        traits: ["exploration", "secret"],
        checkType,
        event: options.event,
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.GatherInformation", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.GatherInformation", "criticalFailure"),
        ],
    });
}
