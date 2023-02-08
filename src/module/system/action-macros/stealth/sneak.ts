import { ActionMacroHelpers, SkillActionOptions } from "..";

const PREFIX = "PF2E.Actions.Sneak";

export function sneak(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "stealth");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: `${PREFIX}.Title`,
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:sneak"],
        extraOptions: ["action:sneak"],
        traits: ["move", "secret"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.perception,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.outcomesNote(selector, `${PREFIX}.Notes.success`, ["success", "criticalSuccess"]),
            ActionMacroHelpers.note(selector, PREFIX, "failure"),
            ActionMacroHelpers.note(selector, PREFIX, "criticalFailure"),
        ],
    });
}
