import { SingleCheckAction } from "@actor/actions/index.ts";
import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";

const PREFIX = "PF2E.Actions.Balance";

function balance(options: SkillActionOptions): void {
    const slug = options?.skill ?? "acrobatics";
    const rollOptions = ["action:balance"];
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
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Balance", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Balance", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Balance", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Balance", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

const action = new SingleCheckAction({
    cost: 1,
    description: `${PREFIX}.Description`,
    name: `${PREFIX}.Title`,
    notes: [
        { outcome: ["criticalSuccess"], text: `${PREFIX}.Notes.criticalSuccess` },
        { outcome: ["success"], text: `${PREFIX}.Notes.success` },
        { outcome: ["failure"], text: `${PREFIX}.Notes.failure` },
        { outcome: ["criticalFailure"], text: `${PREFIX}.Notes.criticalFailure` },
    ],
    rollOptions: ["action:balance"],
    slug: "balance",
    statistic: "acrobatics",
    traits: ["move"],
});

export { balance as legacy, action };
