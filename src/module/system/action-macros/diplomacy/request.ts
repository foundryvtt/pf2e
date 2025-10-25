import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "PF2E.Actions.Request";

function request(options: SkillActionOptions): void {
    const slug = options?.skill ?? "diplomacy";
    const rollOptions = ["action:request"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: `${PREFIX}.Title`,
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["auditory", "concentrate", "linguistic", "mental"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Request", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Request", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Request", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Request", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

const action = new SingleCheckAction({
    cost: 1,
    description: `${PREFIX}.Description`,
    img: "icons/skills/social/diplomacy-peace-alliance.webp",
    name: `${PREFIX}.Title`,
    notes: [
        { outcome: ["criticalSuccess"], text: `${PREFIX}.Notes.criticalSuccess` },
        { outcome: ["success"], text: `${PREFIX}.Notes.success` },
        { outcome: ["failure"], text: `${PREFIX}.Notes.failure` },
        { outcome: ["criticalFailure"], text: `${PREFIX}.Notes.criticalFailure` },
    ],
    section: "skill",
    slug: "request",
    statistic: "diplomacy",
    traits: ["auditory", "concentrate", "linguistic", "mental"],
});

export { request as legacy, action };
