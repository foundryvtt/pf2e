import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "PF2E.Actions.Perform";

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

function perform(options: { variant: PerformVariant } & SkillActionOptions): void {
    const traits = PERFORM_VARIANT_TRAITS[options?.variant ?? ""];
    if (!traits) {
        const msg = game.i18n.format(`${PREFIX}.Warning.UnknownVariant`, { variant: options.variant });
        ui.notifications.warn(msg);
        return;
    }
    const slug = options?.skill ?? "performance";
    const rollOptions = ["action:perform", `action:perform:${options.variant}`];
    const modifiers = options?.modifiers;
    const mainTitle = `${PREFIX}.Title`;
    const subtitle = `${PREFIX}.${options.variant.charAt(0).toUpperCase()}${options.variant.slice(1)}.Title`;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "1",
        title: `${game.i18n.localize(mainTitle)} - ${game.i18n.localize(subtitle)}`,
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["concentrate", ...traits].sort(),
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass ?? "will",
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, PREFIX, "criticalSuccess"),
            ActionMacroHelpers.note(selector, PREFIX, "success"),
            ActionMacroHelpers.note(selector, PREFIX, "failure"),
            ActionMacroHelpers.note(selector, PREFIX, "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

const action = new SingleCheckAction({
    cost: 1,
    description: `${PREFIX}.Description`,
    name: `${PREFIX}.Title`,
    notes: [
        { outcome: ["criticalSuccess"], text: `${PREFIX}.Notes.criticalSuccess` },
        { outcome: ["success"], text: `${PREFIX}.Notes.success` },
        { outcome: ["failure"], text: `${PREFIX}.Notes.failure` },
        { outcome: ["criticalFailure"], text: `${PREFIX}.Notes.criticalFailure` },
    ],
    sampleTasks: {
        untrained: `${PREFIX}.SampleTasks.Untrained`,
        trained: `${PREFIX}.SampleTasks.Trained`,
        expert: `${PREFIX}.SampleTasks.Expert`,
        master: `${PREFIX}.SampleTasks.Master`,
        legendary: `${PREFIX}.SampleTasks.Legendary`,
    },
    section: "skill",
    slug: "perform",
    statistic: "performance",
    traits: ["concentrate"],
    variants: [
        {
            name: `${PREFIX}.Acting.Title`,
            rollOptions: ["action:perform", "action:perform:acting"],
            slug: "acting",
            traits: ["auditory", "concentrate", "linguistic", "visual"],
        },
        {
            name: `${PREFIX}.Comedy.Title`,
            rollOptions: ["action:perform", "action:perform:comedy"],
            slug: "comedy",
            traits: ["auditory", "concentrate", "linguistic", "visual"],
        },
        {
            name: `${PREFIX}.Dance.Title`,
            rollOptions: ["action:perform", "action:perform:dance"],
            slug: "dance",
            traits: ["concentrate", "move", "visual"],
        },
        {
            name: `${PREFIX}.Keyboards.Title`,
            rollOptions: ["action:perform", "action:perform:keyboards"],
            slug: "keyboards",
            traits: ["auditory", "concentrate", "manipulate"],
        },
        {
            name: `${PREFIX}.Oratory.Title`,
            rollOptions: ["action:perform", "action:perform:oratory"],
            slug: "oratory",
            traits: ["auditory", "concentrate", "linguistic"],
        },
        {
            name: `${PREFIX}.Percussion.Title`,
            rollOptions: ["action:perform", "action:perform:percussion"],
            slug: "percussion",
            traits: ["auditory", "concentrate", "manipulate"],
        },
        {
            name: `${PREFIX}.Singing.Title`,
            rollOptions: ["action:perform", "action:perform:singing"],
            slug: "singing",
            traits: ["auditory", "concentrate", "linguistic"],
        },
        {
            name: `${PREFIX}.Strings.Title`,
            rollOptions: ["action:perform", "action:perform:strings"],
            slug: "strings",
            traits: ["auditory", "concentrate", "manipulate"],
        },
        {
            name: `${PREFIX}.Winds.Title`,
            rollOptions: ["action:perform", "action:perform:winds"],
            slug: "winds",
            traits: ["auditory", "concentrate", "manipulate"],
        },
    ],
});

export { perform as legacy, action };
