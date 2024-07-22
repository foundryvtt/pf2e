import { SingleCheckAction } from "@actor/actions/index.ts";
import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";

const PREFIX = "PF2E.Actions.ManeuverInFlight";

async function maneuverInFlight(options: SkillActionOptions): Promise<void> {
    const slug = options?.skill ?? "acrobatics";
    const rollOptions = ["action:maneuver-in-flight"];
    const modifiers = options?.modifiers;

    return ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: `${PREFIX}.Title`,
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["move"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
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
    cost: 1,
    description: `${PREFIX}.Description`,
    img: "icons/skills/movement/feet-winged-boots-blue.webp",
    name: `${PREFIX}.Title`,
    outcomes: {
        success: `${PREFIX}.Outcome.success`,
        failure: `${PREFIX}.Outcome.failure`,
        criticalFailure: `${PREFIX}.Outcome.criticalFailure`,
    },
    rollOptions: ["action:maneuver-in-flight"],
    sampleTasks: {
        trained: `${PREFIX}.SampleTasks.Trained`,
        expert: `${PREFIX}.SampleTasks.Expert`,
        master: `${PREFIX}.SampleTasks.Master`,
        legendary: `${PREFIX}.SampleTasks.Legendary`,
    },
    section: "skill",
    slug: "maneuver-in-flight",
    statistic: "acrobatics",
    traits: ["move"],
});

export { maneuverInFlight as legacy, action };
