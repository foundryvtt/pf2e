import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { SingleCheckAction } from "@actor/actions/index.ts";

function track(options: SkillActionOptions): void {
    const slug = options?.skill ?? "survival";
    const rollOptions = ["action:track"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.Track.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["concentrate", "exploration", "move"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Track", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Track", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Track", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

const action = new SingleCheckAction({
    description: "PF2E.Actions.Track.Description",
    name: "PF2E.Actions.Track.Title",
    notes: [
        { outcome: ["success", "criticalSuccess"], text: "PF2E.Actions.Track.Notes.success" },
        { outcome: ["failure"], text: "PF2E.Actions.Track.Notes.failure" },
        { outcome: ["criticalFailure"], text: "PF2E.Actions.Track.Notes.criticalFailure" },
    ],
    rollOptions: ["action:track"],
    slug: "track",
    statistic: "survival",
    traits: ["concentrate", "exploration", "move"],
});

export { track as legacy, action };
