import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { SingleCheckAction } from "@actor/actions/index.ts";

function senseMotive(options: SkillActionOptions): void {
    const slug = options?.skill ?? "perception";
    const rollOptions = ["action:sense-motive"];
    const modifiers = options?.modifiers;
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.SenseMotive.Title",
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["concentrate", "secret"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.skills.deception,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.SenseMotive", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.SenseMotive", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.SenseMotive", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.SenseMotive", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}

const action = new SingleCheckAction({
    cost: 1,
    description: "PF2E.Actions.SenseMotive.Description",
    difficultyClass: "skills.deception",
    name: "PF2E.Actions.SenseMotive.Title",
    notes: [
        { outcome: ["criticalSuccess"], text: "PF2E.Actions.SenseMotive.Notes.criticalSuccess" },
        { outcome: ["success"], text: "PF2E.Actions.SenseMotive.Notes.success" },
        { outcome: ["failure"], text: "PF2E.Actions.SenseMotive.Notes.failure" },
        { outcome: ["criticalFailure"], text: "PF2E.Actions.SenseMotive.Notes.criticalFailure" },
    ],
    rollOptions: ["action:sense-motive"],
    slug: "sense-motive",
    statistic: "perception",
    traits: ["concentrate", "secret"],
});

export { senseMotive as legacy, action };
