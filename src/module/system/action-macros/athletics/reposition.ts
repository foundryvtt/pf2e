import { ActorPF2e } from "@actor";
import { WeaponPF2e } from "@item";
import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { SingleCheckAction } from "@actor/actions/index.ts";

const PREFIX = "PF2E.Actions.Reposition";

function reposition(options: SkillActionOptions): void {
    const slug = options?.skill ?? "athletics";
    const modifiers = options?.modifiers;
    const rollOptions = ["action:reposition", "forced-movement"];
    ActionMacroHelpers.simpleRollActionCheck<WeaponPF2e<ActorPF2e>>({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: `${PREFIX}.Title`,
        checkContext: (opts) => ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug }),
        traits: ["attack"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass ?? "fortitude",
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, PREFIX, "criticalSuccess"),
            ActionMacroHelpers.note(selector, PREFIX, "success"),
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
    difficultyClass: "fortitude",
    img: "icons/skills/movement/figure-running-gray.webp",
    name: `${PREFIX}.Title`,
    notes: [
        { outcome: ["criticalSuccess"], text: `${PREFIX}.Notes.criticalSuccess` },
        { outcome: ["success"], text: `${PREFIX}.Notes.success` },
        { outcome: ["criticalFailure"], text: `${PREFIX}.Notes.criticalFailure` },
    ],
    rollOptions: ["forced-movement"],
    section: "skill",
    slug: "reposition",
    statistic: "athletics",
    traits: ["attack"],
});

export { reposition as legacy, action };
