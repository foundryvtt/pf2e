import { SingleCheckAction } from "@actor/actions/index.ts";
import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";

const PREFIX = "PF2E.Actions.TumbleThrough";

function tumbleThrough(options: SkillActionOptions): void {
    const slug = options?.skill ?? "acrobatics";
    const rollOptions = ["action:tumble-through"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: `${PREFIX}.Title`,
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["move"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.reflex,
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
    cost: 1,
    description: `${PREFIX}.Description`,
    difficultyClass: "saves.reflex",
    name: `${PREFIX}.Title`,
    notes: [
        { outcome: ["success", "criticalSuccess"], text: `${PREFIX}.Notes.success` },
        { outcome: ["failure", "criticalFailure"], text: `${PREFIX}.Notes.failure` },
    ],
    rollOptions: ["action:tumble-through"],
    slug: "tumble-through",
    statistic: "acrobatics",
    traits: ["move"],
});

export { tumbleThrough as legacy, action };
