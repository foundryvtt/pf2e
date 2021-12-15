import { ActionsPF2e, SkillActionOptions } from "../actions";

export function bonMot(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "diplomacy");
    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.BonMot.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:bon-mot"],
        extraOptions: ["action:bon-mot"],
        traits: ["auditory", "concentrate", "emotion", "linguistic", "mental"],
        checkType,
        event: options.event,
        difficultyClassStatistic: (target) => target.saves.will,
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.BonMot", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.BonMot", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.BonMot", "criticalFailure"),
        ],
    });
}
