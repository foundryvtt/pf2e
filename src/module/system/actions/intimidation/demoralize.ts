import { ActionsPF2e, SkillActionOptions } from "../actions";

export function demoralize(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionsPF2e.resolveStat(options?.skill ?? "intimidation");
    ActionsPF2e.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Demoralize.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:demoralize"],
        extraOptions: ["action:demoralize"],
        traits: ["auditory", "concentrate", "emotion", "fear", "mental"],
        checkType,
        event: options.event,
        difficultyClassStatistic: (target) => target.saves.will,
        extraNotes: (selector: string) => [
            ActionsPF2e.note(selector, "PF2E.Actions.Demoralize", "criticalSuccess"),
            ActionsPF2e.note(selector, "PF2E.Actions.Demoralize", "success"),
        ],
    });
}
