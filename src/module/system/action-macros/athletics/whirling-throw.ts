import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { ModifierPF2e } from "@actor/modifiers.ts";
import { CreaturePF2e } from "@actor";
import { ActorSizePF2e } from "@actor/data/size.ts";

function determineSizeBonus(actorSize: ActorSizePF2e, targetSize: ActorSizePF2e) {
    const sizeDifference = actorSize.difference(targetSize);

    return Math.clamped(2 * sizeDifference, -4, 4);
}

export function whirlingThrow(options: SkillActionOptions): void {
    const slug = options?.skill ?? "athletics";
    const rollOptions = ["action:whirling-throw"];
    ActionMacroHelpers.simpleRollActionCheck({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.WhirlingThrow.Title",
        checkContext: (opts) => {
            const modifiers = options.modifiers?.length ? [...options.modifiers] : [];
            if (opts.actor instanceof CreaturePF2e && opts.target instanceof CreaturePF2e) {
                const actorSize = opts.actor.system.traits.size;
                const targetSize = opts.target.system.traits.size;
                const sizeModifier = new ModifierPF2e(
                    "Size Modifier",
                    determineSizeBonus(actorSize, targetSize),
                    "circumstance"
                );
                if (sizeModifier.modifier) {
                    modifiers.push(sizeModifier);
                }
            }
            return ActionMacroHelpers.defaultCheckContext(opts, { modifiers, rollOptions, slug });
        },
        traits: ["monk"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.fortitude,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.WhirlingThrow", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.WhirlingThrow", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.WhirlingThrow", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.WhirlingThrow", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}
