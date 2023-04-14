import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { SingleCheckAction } from "@actor/actions/index.ts";

function pickALock(options: SkillActionOptions): void {
    const slug = options?.skill ?? "thievery";
    const rollOptions = ["action:pick-a-lock"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "D",
        title: "PF2E.Actions.PickALock.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["manipulate"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.PickALock", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.PickALock", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.PickALock", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

const action = new SingleCheckAction({
    cost: 2,
    description: "PF2E.Actions.PickALock.Description",
    name: "PF2E.Actions.PickALock.Title",
    notes: [
        { outcome: ["criticalSuccess"], text: "PF2E.Actions.PickALock.Notes.criticalSuccess" },
        { outcome: ["success"], text: "PF2E.Actions.PickALock.Notes.success" },
        { outcome: ["criticalFailure"], text: "PF2E.Actions.PickALock.Notes.criticalFailure" },
    ],
    rollOptions: ["action:pick-a-lock"],
    slug: "pick-a-lock",
    statistic: "thievery",
    traits: ["manipulate"],
});

export { pickALock as legacy, action };
