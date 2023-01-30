import { ActionMacroHelpers, SkillActionOptions } from "..";

export function decipherWriting(options: SkillActionOptions) {
    if (!options.skill) {
        ui.notifications.warn(game.i18n.localize("PF2E.Actions.DecipherWriting.Warning.NoSkill"));
        return;
    }
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options.skill!);
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.DecipherWriting.Title",
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:decipher-writing"],
        extraOptions: ["action:decipher-writing"],
        traits: ["concentrate", "exploration", "secret"],
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.DecipherWriting", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.DecipherWriting", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.DecipherWriting", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.DecipherWriting", "criticalFailure"),
        ],
    });
}
