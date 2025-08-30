import type { ActorType } from "@actor/types.ts";
import type { MeleePF2e, WeaponPF2e } from "@item";
import { AbilityTrait } from "@item/ability/types.ts";
import { addOrUpgradeTrait, removeTrait } from "@item/helpers.ts";
import { RUNE_DATA, prunePropertyRunes } from "@item/physical/runes.ts";
import { WeaponRangeIncrement } from "@item/weapon/types.ts";
import { MaterialDamageEffect } from "@system/damage/index.ts";
import { PredicateField } from "@system/schema-data-fields.ts";
import { ErrorPF2e, objectHasKey, sluggify } from "@util";
import * as R from "remeda";
import { StrikeAdjustment } from "../synthetics.ts";
import { AELikeChangeMode, AELikeRuleElement } from "./ae-like.ts";
import { RuleElementOptions, RuleElementPF2e } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema, RuleElementSource } from "./data.ts";
import fields = foundry.data.fields;

class AdjustStrikeRuleElement extends RuleElementPF2e<AdjustStrikeSchema> {
    protected static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    constructor(data: AdjustStrikeSource, options: RuleElementOptions) {
        super({ ...data, priority: 110 }, options);
    }

    static VALID_PROPERTIES = new Set([
        "materials",
        "property-runes",
        "range-increment",
        "traits",
        "weapon-traits",
    ] as const);

    static override defineSchema(): AdjustStrikeSchema {
        return {
            ...super.defineSchema(),
            mode: new fields.StringField({
                required: true,
                choices: R.keys(AELikeRuleElement.CHANGE_MODE_DEFAULT_PRIORITIES),
                initial: undefined,
            }),
            property: new fields.StringField({
                required: true,
                choices: Array.from(this.VALID_PROPERTIES),
                initial: undefined,
            }),
            definition: new PredicateField(),
            value: new ResolvableValueField({ required: true, nullable: false, initial: undefined }),
        };
    }

    /** Instead of applying the change directly to a property path, defer it to a synthetic */
    override beforePrepareData(): void {
        if (!this.test()) return;

        const change = this.resolveValue(this.value);

        const adjustment = ((): StrikeAdjustment => {
            if (!this.property) throw ErrorPF2e("Unexpected error applying adjustment");

            const definition = this.resolveInjectedProperties(this.definition);

            switch (this.property) {
                case "materials":
                    return {
                        adjustDamageRoll: (
                            weapon: WeaponPF2e | MeleePF2e,
                            { materials }: { materials?: Set<MaterialDamageEffect> },
                        ): void => {
                            if (!["add", "subtract", "remove"].includes(this.mode)) {
                                return this.failValidation(
                                    'A strike adjustment of material effects must be used with the "add", "subtract", or "remove" mode.',
                                );
                            }
                            if (!definition.test(weapon.getRollOptions("item"))) {
                                return;
                            }
                            if (!objectHasKey(CONFIG.PF2E.materialDamageEffects, change)) {
                                return this.failValidation(`"${change}" is not a supported weapon material effect.`);
                            }

                            const method = this.mode === "add" ? "add" : "delete";
                            materials?.[method](change);
                        },
                    };
                case "range-increment":
                    return {
                        adjustWeapon: (weapon: WeaponPF2e | MeleePF2e): void => {
                            if (weapon.isOfType("melee")) return; // Currently not supported

                            if (typeof change !== "number") {
                                return this.failValidation("Change value is not a number.");
                            }

                            if (!definition.test(weapon.getRollOptions("item"))) {
                                return;
                            }

                            const rangeIncrement = weapon.range?.increment;
                            if (typeof rangeIncrement !== "number") {
                                return this.failValidation(
                                    "A weapon that meets the definition lacks a range increment.",
                                );
                            }

                            const newRangeIncrement = AELikeRuleElement.getNewValue(this.mode, rangeIncrement, change);
                            weapon.system.range = newRangeIncrement as WeaponRangeIncrement;
                        },
                    };
                case "traits":
                    return {
                        adjustTraits: (weapon: WeaponPF2e | MeleePF2e, traits: AbilityTrait[]): void => {
                            if (!["add", "subtract", "remove"].includes(this.mode)) {
                                return this.failValidation(
                                    'A strike adjustment of traits must be used with the "add", "subtract", or "remove" mode.',
                                );
                            }
                            if (!objectHasKey(CONFIG.PF2E.actionTraits, change)) {
                                return this.failValidation(`"${change}" is not a recognized action trait.`);
                            }
                            if (!definition.test(weapon.getRollOptions("item"))) {
                                return;
                            }

                            if (this.mode === "add" && !traits.includes(change)) {
                                traits.push(change);
                            } else if (["subtract", "remove"].includes(this.mode) && traits.includes(change)) {
                                traits.splice(traits.indexOf(change), 1);
                            }
                        },
                    };
                case "weapon-traits":
                    return {
                        adjustWeapon: (weapon: WeaponPF2e | MeleePF2e): void => {
                            if (!["add", "subtract", "remove"].includes(this.mode)) {
                                return this.failValidation(
                                    'A strike adjustment of weapon traits must be used with the "add", "subtract", or "remove" mode.',
                                );
                            }
                            if (
                                !objectHasKey(CONFIG.PF2E.weaponTraits, change) &&
                                !(weapon.isOfType("melee") && objectHasKey(CONFIG.PF2E.npcAttackTraits, change))
                            ) {
                                return this.failValidation(`"${change}" is not a recognized weapon trait.`);
                            }
                            if (!definition.test(weapon.getRollOptions("item"))) {
                                return;
                            }

                            // Don't apply the versatile or modular trait to the basic unarmed attack
                            if (weapon.slug === "basic-unarmed" && /^(?:modular|versatile)/.test(change)) {
                                return;
                            }

                            const traits = weapon.system.traits;

                            // If the weapon's base damage type is the same as a modular or versatile damage type, skip
                            // adding the trait
                            const damageType = weapon.isOfType("weapon") ? weapon.system.damage.damageType.at(0) : null;
                            if (
                                this.mode === "add" &&
                                [`modular-${damageType}`, `versatile-${damageType}`].includes(change)
                            ) {
                                return;
                            }

                            if (this.mode === "add") {
                                addOrUpgradeTrait(traits, change);
                            } else {
                                removeTrait(traits, change);
                            }
                        },
                    };
                case "property-runes":
                    return {
                        adjustWeapon: (weapon: WeaponPF2e | MeleePF2e): void => {
                            if (!["add", "subtract", "remove"].includes(this.mode)) {
                                return this.failValidation(
                                    'A strike adjustment of weapon property runes must be used with the "add", "subtract", or "remove" mode.',
                                );
                            }
                            const runeSlug = sluggify(String(change), { camel: "dromedary" });
                            if (!objectHasKey(RUNE_DATA.weapon.property, runeSlug)) {
                                return this.failValidation(`"${change}" is not a recognized weapon property rune.`);
                            }
                            if (!definition.test(weapon.getRollOptions("item"))) {
                                return;
                            }

                            const propertyRunes = weapon.system.runes.property;

                            if (this.mode === "add") {
                                propertyRunes.push(runeSlug);
                            } else if (propertyRunes.includes(runeSlug)) {
                                propertyRunes.splice(propertyRunes.indexOf(runeSlug), 1);
                            }

                            weapon.system.runes.property = prunePropertyRunes(propertyRunes, RUNE_DATA.weapon.property);
                            if (weapon.isOfType("weapon")) weapon.name = game.pf2e.system.generateItemName(weapon);
                        },
                    };
            }
        })();

        this.actor.synthetics.strikeAdjustments.push(adjustment);
    }
}

interface AdjustStrikeRuleElement
    extends RuleElementPF2e<AdjustStrikeSchema>,
        ModelPropsFromRESchema<AdjustStrikeSchema> {}

type AdjustStrikeSchema = RuleElementSchema & {
    mode: fields.StringField<AELikeChangeMode, AELikeChangeMode, true, false, false>;
    /** The property of the strike to adjust */
    property: fields.StringField<AdjustStrikeProperty, AdjustStrikeProperty, true, false, false>;
    /** The definition of the strike in terms of its item (weapon) roll options */
    definition: PredicateField;
    value: ResolvableValueField<true, false, false>;
};

type AdjustStrikeProperty = SetElement<(typeof AdjustStrikeRuleElement)["VALID_PROPERTIES"]>;

interface AdjustStrikeSource extends RuleElementSource {
    mode?: unknown;
    property?: unknown;
    definition?: unknown;
}

export { AdjustStrikeRuleElement };
