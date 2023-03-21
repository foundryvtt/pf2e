import { ActorPF2e } from "@actor";
import { MODIFIER_TYPE, ModifierPF2e } from "@actor/modifiers";
import { WeaponPF2e } from "@item";
import { extractModifierAdjustments } from "@module/rules/helpers";
import { ActionMacroHelpers, SkillActionOptions } from "..";

export function trip(options: SkillActionOptions) {
    const slug = options?.skill ?? "athletics";
    const rollOptions = ["action:trip"];
    ActionMacroHelpers.simpleRollActionCheck<WeaponPF2e<ActorPF2e>>({
        actors: options.actors,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Trip.Title",
        checkContext: (opts) => {
            // weapon
            const item = [
                ...(ActionMacroHelpers.getApplicableEquippedWeapons(opts.actor, "trip") ?? []),
                ...(ActionMacroHelpers.getApplicableEquippedWeapons(opts.actor, "ranged-trip") ?? []),
            ].shift();

            // context
            const context = ActionMacroHelpers.defaultCheckContext(opts, {
                item,
                modifiers: options.modifiers,
                rollOptions,
                slug,
            });

            // modifiers
            if (item && context) {
                const modifiers = context.modifiers?.length ? [...context.modifiers] : [];
                if (item.traits.has("trip") || item.traits.has("ranged-trip")) {
                    const modifier = ActionMacroHelpers.getWeaponPotencyModifier(item, slug);
                    if (modifier) {
                        modifiers.push(modifier);
                    }
                }
                if (item.traits.has("ranged-trip")) {
                    modifiers.push(
                        new ModifierPF2e({
                            slug: "ranged-trip",
                            adjustments: extractModifierAdjustments(
                                opts.actor.synthetics.modifierAdjustments,
                                context.rollOptions,
                                "ranged-trip"
                            ),
                            type: MODIFIER_TYPE.CIRCUMSTANCE,
                            label: CONFIG.PF2E.weaponTraits["ranged-trip"],
                            modifier: -2,
                        })
                    );
                }
                context.modifiers = modifiers;
            }

            return context;
        },
        traits: ["attack"],
        event: options.event,
        callback: options.callback,
        difficultyClass: options.difficultyClass,
        difficultyClassStatistic: (target) => target.saves.reflex,
        extraNotes: (selector: string) => [
            ActionMacroHelpers.note(selector, "PF2E.Actions.Trip", "criticalSuccess"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Trip", "success"),
            ActionMacroHelpers.note(selector, "PF2E.Actions.Trip", "criticalFailure"),
        ],
    });
}
