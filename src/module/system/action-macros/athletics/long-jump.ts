import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "PF2E.Actions.LongJump";

function longJump(options: SkillActionOptions): void {
    const slug = options?.skill ?? "athletics";
    const rollOptions = ["action:stride", "action:leap", "action:long-jump"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "D",
        title: `${PREFIX}.Title`,
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["move"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass ?? { value: 15 },
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
    cost: 2,
    description: `${PREFIX}.Description`,
    difficultyClass: { value: 15 },
    img: "icons/skills/movement/figure-running-gray.webp",
    name: `${PREFIX}.Title`,
    notes: [
        { outcome: ["success", "criticalSuccess"], text: `${PREFIX}.Notes.success` },
        { outcome: ["failure"], text: `${PREFIX}.Notes.failure` },
        { outcome: ["criticalFailure"], text: `${PREFIX}.Notes.criticalFailure` },
    ],
    rollOptions: ["action:stride", "action:leap"],
    section: "skill",
    slug: "long-jump",
    statistic: "athletics",
    traits: ["move"],
});

export { longJump as legacy, action };
