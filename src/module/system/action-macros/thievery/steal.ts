import { SingleCheckAction } from "@actor/actions/index.ts";
import { Modifier } from "@actor/modifiers.ts";
import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";

const PREFIX = "PF2E.Actions.Steal";

function steal(options: SkillActionOptions): void {
    const modifiers = [
        new Modifier({
            label: "PF2E.Actions.Steal.Pocketed",
            modifier: -5,
            predicate: ["action:steal:pocketed"],
        }),
    ].concat(options?.modifiers ?? []);
    const slug = options?.skill ?? "thievery";
    const rollOptions = ["action:steal"];
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: `${PREFIX}.Title`,
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["manipulate"],
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
    cost: 1,
    description: `${PREFIX}.Description`,
    difficultyClass: "perception",
    img: `${SYSTEM_ROOT}/icons/features/classes/thief.webp`,
    modifiers: [{ label: "PF2E.Actions.Steal.Pocketed", modifier: -5, predicate: ["action:steal:pocketed"] }],
    name: `${PREFIX}.Title`,
    notes: [
        { outcome: ["success", "criticalSuccess"], text: `${PREFIX}.Notes.success` },
        { outcome: ["failure", "criticalFailure"], text: `${PREFIX}.Notes.failure` },
    ],
    section: "skill",
    slug: "steal",
    statistic: "thievery",
    traits: ["manipulate"],
});

export { action, steal as legacy };
