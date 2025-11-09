import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "PF2E.Actions.Impersonate";

function impersonate(options: SkillActionOptions): void {
    const slug = options?.skill ?? "deception";
    const rollOptions = ["action:impersonate"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph,
        title: `${PREFIX}.Title`,
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["concentrate", "exploration", "manipulate", "secret"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass ?? "perception",
        extraNotes: (selector: string) => [
            ActionMacroHelpers.outcomesNote(selector, `${PREFIX}.Notes.success`, ["success", "criticalSuccess"]),
            ActionMacroHelpers.note(selector, PREFIX, "failure"),
            ActionMacroHelpers.note(selector, PREFIX, "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

const action = new SingleCheckAction({
    description: `${PREFIX}.Description`,
    difficultyClass: "perception",
    img: "icons/skills/social/theft-pickpocket-bribery-brown.webp",
    name: `${PREFIX}.Title`,
    notes: [
        { outcome: ["success", "criticalSuccess"], text: `${PREFIX}.Notes.success` },
        { outcome: ["failure"], text: `${PREFIX}.Notes.failure` },
        { outcome: ["criticalFailure"], text: `${PREFIX}.Notes.criticalFailure` },
    ],
    section: "skill",
    slug: "impersonate",
    statistic: "deception",
    traits: ["concentrate", "exploration", "manipulate", "secret"],
});

export { impersonate as legacy, action };
