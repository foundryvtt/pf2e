import { ActionMacroHelpers, SkillActionOptions } from "..";

const PREFIX = "PF2E.Actions.TumbleThrough.Notes";

export function tumbleThrough(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "acrobatics");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: `${PREFIX}.Title`,
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:tumble-through"],
        extraOptions: ["action:tumble-through"],
        traits: ["move"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.reflex,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.outcomesNote(selector, `${PREFIX}.success`, ["success", "criticalSuccess"]),
            ActionMacroHelpers.outcomesNote(selector, `${PREFIX}.failure`, ["failure", "criticalFailure"]),
        ],
    });
}
