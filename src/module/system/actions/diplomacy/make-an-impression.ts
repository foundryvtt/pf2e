import { ActionsPF2e, SkillActionOptions } from "../actions";

export function makeAnImpression(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "diplomacy");
    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.MakeAnImpression.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:make-an-impression"],
        extraOptions: ["action:make-an-impression"],
        traits: ["auditory", "concentrate", "exploration", "linguistic", "mental"],
        checkType,
        event: options.event,
        difficultyClassStatistic: (target) => target.saves.will,
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.MakeAnImpression", "success"),
            ActionsPF2e.note(selector, "PF2E.Actions.MakeAnImpression", "failure"),
            ActionsPF2e.note(selector, "PF2E.Actions.MakeAnImpression", "criticalFailure"),
        ],
    });
}
