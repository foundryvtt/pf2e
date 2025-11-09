import { SingleCheckAction } from "@actor/actions/index.ts";
import { Modifier } from "@actor/modifiers.ts";
import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";

function demoralize(options: SkillActionOptions): void {
    const slug = options?.skill ?? "intimidation";
    const rollOptions = ["action:demoralize"];
    const modifiers = [
        new Modifier({
            label: "PF2E.Actions.Demoralize.Unintelligible",
            modifier: -4,
            predicate: ["action:demoralize:unintelligible"],
            type: "circumstance",
        }),
    ].concat(options?.modifiers ?? []);
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Demoralize.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["auditory", "concentrate", "emotion", "fear", "mental"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass ?? "will",
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Demoralize", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Demoralize", "success"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

const action = new SingleCheckAction({
    cost: 1,
    description: "PF2E.Actions.Demoralize.Description",
    difficultyClass: "will",
    img: "icons/skills/social/intimidation-impressing.webp",
    modifiers: [
        {
            label: "PF2E.Actions.Demoralize.Unintelligible",
            modifier: -4,
            predicate: ["action:demoralize:unintelligible"],
            type: "circumstance",
        },
    ],
    name: "PF2E.Actions.Demoralize.Title",
    notes: [
        { outcome: ["criticalSuccess"], text: "PF2E.Actions.Demoralize.Notes.criticalSuccess" },
        { outcome: ["success"], text: "PF2E.Actions.Demoralize.Notes.success" },
    ],
    section: "skill",
    slug: "demoralize",
    statistic: "intimidation",
    traits: ["auditory", "concentrate", "emotion", "fear", "mental"],
});

export { action, demoralize as legacy };
