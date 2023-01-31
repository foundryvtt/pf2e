import { ActionMacroHelpers, SkillActionOptions } from "..";

const PERFORM_VARIANT_TRAITS = {
    acting: ["auditory", "linguistic", "visual"],
    comedy: ["auditory", "linguistic", "visual"],
    dance: ["move", "visual"],
    keyboards: ["auditory", "manipulate"],
    oratory: ["auditory", "linguistic"],
    percussion: ["auditory", "manipulate"],
    singing: ["auditory", "linguistic"],
    strings: ["auditory", "manipulate"],
    winds: ["auditory", "manipulate"],
} as const;
type PerformVariant = keyof typeof PERFORM_VARIANT_TRAITS;

export function perform(options: { variant: PerformVariant } & SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "performance");
    const traits = PERFORM_VARIANT_TRAITS[options.variant];
    if (!traits) {
        const msg = game.i18n.format("PF2E.Actions.Perform.Warning.UnknownVariant", { variant: options.variant });
        ui.notifications.warn(msg);
        return;
    }
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: `PF2E.Actions.Perform.Title.${options.variant.charAt(0).toUpperCase()}${options.variant.slice(1)}`,
        subtitle,
        modifiers: options.modifiers,
        rollOptions: ["all", checkType, stat, "action:perform", `action:perform:${options.variant}`],
        extraOptions: ["action:perform", `action:perform:${options.variant}`],
        traits: ["concentrate", ...traits].sort(),
        checkType,
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.perception,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Perform", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Perform", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Perform", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Perform", "criticalFailure"),
        ],
    });
}
