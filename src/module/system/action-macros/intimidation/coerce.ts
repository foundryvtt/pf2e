import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { SingleCheckAction } from "@actor/actions/index.ts";

function coerce(options: SkillActionOptions): void {
    const slug = options?.skill ?? "intimidation";
    const rollOptions = ["action:coerce"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.Coerce.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["auditory", "concentrate", "emotion", "exploration", "linguistic", "mental"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.will,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Coerce", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Coerce", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Coerce", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Coerce", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

const action = new SingleCheckAction({
    description: "PF2E.Actions.Coerce.Description",
    difficultyClass: "saves.will",
    name: "PF2E.Actions.Coerce.Title",
    notes: [
        { outcome: ["criticalSuccess"], text: "PF2E.Actions.Coerce.Notes.criticalSuccess" },
        { outcome: ["success"], text: "PF2E.Actions.Coerce.Notes.success" },
        { outcome: ["failure"], text: "PF2E.Actions.Coerce.Notes.failure" },
        { outcome: ["criticalFailure"], text: "PF2E.Actions.Coerce.Notes.criticalFailure" },
    ],
    rollOptions: ["action:coerce"],
    slug: "coerce",
    statistic: "intimidation",
    traits: ["auditory", "concentrate", "emotion", "exploration", "linguistic", "mental"],
});

export { coerce as legacy, action };
