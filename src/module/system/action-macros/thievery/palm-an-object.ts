import { ActionMacroHelpers, SkillActionOptions } from "..";

const PREFIX = "PF2E.Actions.PalmAnObject";

export function palmAnObject(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "thievery");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: `${PREFIX}.Title`,
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:palm-an-object"],
        extraOptions: ["action:palm-an-object"],
        traits: ["manipulate"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.perception,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.outcomesNote(selector, `${PREFIX}.Notes.success`, ["success", "criticalSuccess"]),
            ActionMacroHelpers.outcomesNote(selector, `${PREFIX}.Notes.failure`, ["failure", "criticalFailure"]),
        ],
    });
}
