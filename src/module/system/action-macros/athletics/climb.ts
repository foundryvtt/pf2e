import { SingleCheckAction } from "@actor/actions/index.ts";
import { Modifier } from "@actor/modifiers.ts";
import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";

const PREFIX = "PF2E.Actions.Climb";

function climb(options: SkillActionOptions): void {
    const slug = options?.skill ?? "athletics";
    const rollOptions = ["action:climb"];
    const modifiers = (options?.modifiers ?? []).concat(
        new Modifier({
            slug: "climb-speed",
            label: `${PREFIX}.Modifier.ClimbSpeed`,
            modifier: 4,
            type: "circumstance",
            predicate: ["speed:climb"],
        }),
    );
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: `${PREFIX}.Title`,
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["move"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, PREFIX, "criticalSuccess"),
            ActionMacroHelpers.note(selector, PREFIX, "success"),
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
    img: "icons/skills/movement/arrow-upward-blue.webp",
    modifiers: [
        {
            slug: "climb-speed",
            label: `${PREFIX}.Modifier.ClimbSpeed`,
            modifier: 4,
            type: "circumstance",
            predicate: ["speed:climb"],
        },
    ],
    name: `${PREFIX}.Title`,
    notes: [
        { outcome: ["criticalSuccess"], text: `${PREFIX}.Notes.criticalSuccess` },
        { outcome: ["success"], text: `${PREFIX}.Notes.success` },
        { outcome: ["criticalFailure"], text: `${PREFIX}.Notes.criticalFailure` },
    ],
    rollOptions: ["action:climb"],
    sampleTasks: {
        untrained: `${PREFIX}.SampleTasks.Untrained`,
        trained: `${PREFIX}.SampleTasks.Trained`,
        expert: `${PREFIX}.SampleTasks.Expert`,
        master: `${PREFIX}.SampleTasks.Master`,
        legendary: `${PREFIX}.SampleTasks.Legendary`,
    },
    section: "skill",
    slug: "climb",
    statistic: "athletics",
    traits: ["move"],
});

export { action, climb as legacy };
