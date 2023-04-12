import { ActorPF2e } from "@actor";
import { ActionMacroHelpers, SkillActionOptions } from "../index.ts";
import { WeaponPF2e } from "@item";

export function grapple(options: SkillActionOptions): void {
    const slug = options?.skill ?? "athletics";
    const rollOptions = ["action:grapple"];
    ActionMacroHelpers.simpleRollActionCheck<WeaponPF2e<ActorPF2e>>({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Grapple.Title",
        checkContext: (opts) => {
            // weapon
            const item = (ActionMacroHelpers.getApplicableEquippedWeapons(opts.actor, "grapple") ?? []).shift();

            // modifier
            const modifiers = options.modifiers?.length ? [...options.modifiers] : [];
            if (item && item.traits.has("grapple")) {
                const modifier = ActionMacroHelpers.getWeaponPotencyModifier(item, slug);
                if (modifier) {
                    modifiers.push(modifier);
                }
            }

            return ActionMacroHelpers.defaultCheckContext(opts, { item, modifiers, rollOptions, slug });
        },
        traits: ["attack"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.fortitude,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Grapple", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Grapple", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Grapple", "failure"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Grapple", "criticalFailure"),
        ],
    }).catch((error: Error) => {
        ui.notifications.error(error.message);
        throw error;
    });
}
