import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "PF2E.Actions.Lie";

function lie(options: SkillActionOptions): void {
    const slug = options?.skill ?? "deception";
    const rollOptions = ["action:lie"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph,
        title: `${PREFIX}.Title`,
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["auditory", "concentrate", "linguistic", "mental", "secret"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass ?? "perception",
        extraNotes: (selector: string) => [
            ActionMacroHelpers.outcomesNote(selector, `${PREFIX}.Notes.success`, ["success", "criticalSuccess"]),
            ActionMacroHelpers.outcomesNote(selector, `${PREFIX}.Notes.failure`, ["failure", "criticalFailure"]),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

const action = new SingleCheckAction({
    description: `${PREFIX}.Description`,
    difficultyClass: "perception",
    name: `${PREFIX}.Title`,
    notes: [
        { outcome: ["success", "criticalSuccess"], text: `${PREFIX}.Notes.success` },
        { outcome: ["failure", "criticalFailure"], text: `${PREFIX}.Notes.failure` },
    ],
    rollOptions: ["action:lie"],
    section: "skill",
    slug: "lie",
    statistic: "deception",
    traits: ["auditory", "concentrate", "linguistic", "mental", "secret"],
});

export { lie as legacy, action };
