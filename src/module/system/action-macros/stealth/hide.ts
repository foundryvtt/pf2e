import { ActionMacroHelpers, SkillActionOptions } from "..";
import { SingleCheckAction } from "@actor/actions";

const PREFIX = "PF2E.Actions.Hide";

function hide(options: SkillActionOptions) {
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
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.perception,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.outcomesNote(selector, `${PREFIX}.Notes.success`, ["success", "criticalSuccess"]),
        ],
    });
}

const action = new SingleCheckAction({
    cost: 1,
    description: `${PREFIX}.Description`,
    difficultyClass: "perception",
    name: `${PREFIX}.Title`,
    notes: [{ outcome: ["success", "criticalSuccess"], text: `${PREFIX}.Notes.success` }],
    rollOptions: ["action:hide"],
    slug: "hide",
    statistic: "stealth",
    traits: ["secret"],
});

export { hide as legacy, action };
