import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { SingleCheckAction } from "@actor/actions/index.ts";

function seek(options: SkillActionOptions): void {
    const slug = options?.skill ?? "perception";
    const rollOptions = ["action:seek"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Seek.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["concentrate", "secret"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Seek", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Seek", "success"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

const action = new SingleCheckAction({
    cost: 1,
    description: "PF2E.Actions.Seek.Description",
    name: "PF2E.Actions.Seek.Title",
    notes: [
        { outcome: ["criticalSuccess"], text: "PF2E.Actions.Seek.Notes.criticalSuccess" },
        { outcome: ["success"], text: "PF2E.Actions.Seek.Notes.success" },
    ],
    rollOptions: ["action:seek"],
    slug: "seek",
    statistic: "perception",
    traits: ["concentrate", "secret"],
});

export { seek as legacy, action };
