import { ActionMacroHelpers, SkillActionOptions } from "..";
import { MODIFIER_TYPE, ModifierPF2e } from "@actor/modifiers";
import { extractModifierAdjustments } from "@module/rules/helpers";
import { WeaponPF2e } from "@item";

export function trip(options: SkillActionOptions) {
    const { checkType, property, stat, subtitle } = ActionMacroHelpers.resolveStat(options?.skill ?? "athletics");
    ActionMacroHelpers.simpleRollActionCheck<Embedded<WeaponPF2e>>({
        actors: options.actors,
        statName: property,
        actionGlyph: options.glyph ?? "A",
        title: "PF2E.Actions.Trip.Title",
        subtitle,
        item: (actor) => {
            return [
                ...(ActionMacroHelpers.getApplicableEquippedWeapons(actor, "trip") ?? []),
                ...(ActionMacroHelpers.getApplicableEquippedWeapons(actor, "ranged-trip") ?? []),
            ].shift();
        },
        modifiers: (args) => {
            const modifiers: ModifierPF2e[] = [];
            if (args.item) {
                if (args.item.traits.has("trip") || args.item.traits.has("ranged-trip")) {
                    const modifier = ActionMacroHelpers.getWeaponPotencyModifier(args.item, stat);
                    if (modifier) {
                        modifiers.push(modifier);
                    }
                }
                if (args.item.traits.has("ranged-trip")) {
                    modifiers.push(
                        new ModifierPF2e({
                            slug: "ranged-trip",
                            adjustments: extractModifierAdjustments(
                                args.actor.synthetics.modifierAdjustments,
                                args.rollOptions,
                                "ranged-trip"
                            ),
                            type: MODIFIER_TYPE.CIRCUMSTANCE,
                            label: CONFIG.PF2E.weaponTraits["ranged-trip"],
                            modifier: -2,
                        })
                    );
                }
            }
            return modifiers.concat(options.modifiers ?? []);
        },
        rollOptions: ["all", checkType, stat, "action:trip"],
        extraOptions: ["action:trip"],
        traits: ["attack"],
        checkType,
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
