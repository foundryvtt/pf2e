import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "PF2E.Actions.GatherInformation";

function gatherInformation(options: SkillActionOptions): void {
    const slug = options?.skill ?? "diplomacy";
    const rollOptions = ["action:gather-information"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph,
        title: `${PREFIX}.Title`,
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["exploration", "secret"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.outcomesNote(selector, `${PREFIX}.Notes.success`, ["success", "criticalSuccess"]),
            ActionMacroHelpers.note(selector, PREFIX, "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

const action = new SingleCheckAction({
    description: `${PREFIX}.Description`,
    img: "icons/skills/social/diplomacy-handshake-blue.webp",
    name: `${PREFIX}.Title`,
    notes: [
        { outcome: ["criticalSuccess", "success"], text: `${PREFIX}.Notes.success` },
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
    slug: "gather-information",
    statistic: "diplomacy",
    traits: ["exploration", "secret"],
});

export { gatherInformation as legacy, action };
