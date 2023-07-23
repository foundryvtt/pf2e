import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";

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

export function perform(options: { variant: PerformVariant } & SkillActionOptions): void {
    const traits = PERFORM_VARIANT_TRAITS[options?.variant ?? ""];
    if (!traits) {
        const msg = game.i18n.format("PF2E.Actions.Perform.Warning.UnknownVariant", { variant: options.variant });
        ui.notifications.warn(msg);
        return;
    }
    const slug = options?.skill ?? "performance";
    const rollOptions = ["action:perform", `action:perform:${options.variant}`];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: `PF2E.Actions.Perform.${options.variant.charAt(0).toUpperCase()}${options.variant.slice(1)}.Title`,
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["concentrate", ...traits].sort(),
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
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}
