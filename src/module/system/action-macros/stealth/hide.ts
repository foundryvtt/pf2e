import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "PF2E.Actions.Hide";

function hide(options: SkillActionOptions): void {
    const slug = options?.skill ?? "stealth";
    const rollOptions = ["action:hide"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: `${PREFIX}.Title`,
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["secret"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass ?? "perception",
        extraNotes: (selector: string) => [
            ActionMacroHelpers.outcomesNote(selector, `${PREFIX}.Notes.success`, ["success", "criticalSuccess"]),
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
    img: "systems/pf2e/icons/conditions/hidden.webp",
    name: `${PREFIX}.Title`,
    notes: [{ outcome: ["success", "criticalSuccess"], text: `${PREFIX}.Notes.success` }],
    section: "skill",
    slug: "hide",
    statistic: "stealth",
    traits: ["secret"],
});

export { hide as legacy, action };
