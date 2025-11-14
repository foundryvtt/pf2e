import { SingleCheckAction } from "@actor/actions/index.ts";
import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";

const PREFIX = "PF2E.Actions.ConcealAnObject";

function concealAnObject(options: SkillActionOptions): Promise<void> {
    const slug = options?.skill ?? "stealth";
    const rollOptions = ["action:conceal-an-object"];
    const modifiers = options?.modifiers;
    return ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: `${PREFIX}.Title`,
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["manipulate", "secret"],
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
    img: `${SYSTEM_ROOT}/icons/conditions/hidden.webp`,
    name: `${PREFIX}.Title`,
    notes: [
        { outcome: ["success", "criticalSuccess"], text: `${PREFIX}.Notes.success` },
        { outcome: ["failure", "criticalFailure"], text: `${PREFIX}.Notes.failure` },
    ],
    section: "skill",
    slug: "conceal-an-object",
    statistic: "stealth",
    traits: ["manipulate", "secret"],
});

export { action, concealAnObject as legacy };
