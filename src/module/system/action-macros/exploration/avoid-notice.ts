import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { SingleCheckAction } from "@actor/actions/index.ts";

function avoidNotice(options: SkillActionOptions): void {
    const slug = options?.skill ?? "stealth";
    const rollOptions = ["action:avoid-notice"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.AvoidNotice.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["exploration"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.AvoidNotice", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.AvoidNotice", "success"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

const action = new SingleCheckAction({
    description: "PF2E.Actions.AvoidNotice.Description",
    name: "PF2E.Actions.AvoidNotice.Title",
    notes: [
        { outcome: ["criticalSuccess"], text: "PF2E.Actions.AvoidNotice.Notes.criticalSuccess" },
        { outcome: ["success"], text: "PF2E.Actions.AvoidNotice.Notes.success" },
    ],
    rollOptions: ["action:avoid-notice"],
    slug: "avoid-notice",
    statistic: "stealth",
    traits: ["exploration"],
});

export { avoidNotice as legacy, action };
