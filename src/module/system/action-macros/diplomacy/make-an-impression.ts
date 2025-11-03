import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "PF2E.Actions.MakeAnImpression";

function makeAnImpression(options: SkillActionOptions): void {
    const slug = options?.skill ?? "diplomacy";
    const rollOptions = ["action:make-an-impression"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph,
        title: "PF2E.Actions.MakeAnImpression.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["auditory", "concentrate", "exploration", "linguistic", "mental"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass ?? "will",
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.MakeAnImpression", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.MakeAnImpression", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.MakeAnImpression", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

const action = new SingleCheckAction({
    description: `${PREFIX}.Description`,
    difficultyClass: "will",
    img: "icons/skills/social/diplomacy-peace-alliance.webp",
    name: `${PREFIX}.Title`,
    notes: [
        { outcome: ["criticalSuccess"], text: `${PREFIX}.Notes.criticalSuccess` },
        { outcome: ["success"], text: `${PREFIX}.Notes.success` },
        { outcome: ["criticalFailure"], text: `${PREFIX}.Notes.criticalFailure` },
    ],
    section: "skill",
    slug: "make-an-impression",
    statistic: "diplomacy",
    traits: ["auditory", "concentrate", "exploration", "linguistic", "mental"],
});

export { makeAnImpression as legacy, action };
