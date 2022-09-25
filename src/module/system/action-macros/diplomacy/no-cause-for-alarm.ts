import { ActionMacroHelpers, SkillActionOptions } from "..";

export function noCauseForAlarm(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "diplomacy");
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.NoCauseForAlarm.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:no-cause-for-alarm"],
        extraOptions: ["action:no-cause-for-alarm"],
        traits: ["auditory", "concentrate", "emotion", "linguistic", "mental"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.will,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.NoCauseForAlarm", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.NoCauseForAlarm", "success"),
        ],
    });
}
