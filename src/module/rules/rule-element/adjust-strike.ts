import { ActorType } from "@actor/data/index.ts";
import { MeleePF2e, WeaponPF2e } from "@item";
import { ActionTrait } from "@item/action/data.ts";
import { prunePropertyRunes } from "@item/weapon/helpers.ts";
import { WeaponRangeIncrement } from "@item/weapon/types.ts";
import { MaterialDamageEffect } from "@system/damage/index.ts";
import { PredicateField } from "@system/schema-data-fields.ts";
import { ErrorPF2e, objectHasKey, sluggify } from "@util";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import { StrikeAdjustment } from "../synthetics.ts";
import { AELikeRuleElement, AELikeSchema, AELikeSource } from "./ae-like.ts";
import { RuleElementOptions } from "./base.ts";
import { ResolvableValueField } from "./data.ts";

class AdjustStrikeRuleElement extends AELikeRuleElement<AdjustStrikeSchema> {
    protected static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    constructor(data: AdjustStrikeSource, options: RuleElementOptions) {
        super({ ...data, path: "ignore", phase: "beforeDerived", priority: 110 }, options);
    }

    static VALID_PROPERTIES = new Set([
        "materials",
        "property-runes",
        "range-increment",
        "traits",
        "weapon-traits",
    ] as const);

    static override defineSchema(): AdjustStrikeSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            // `path` isn't used for AdjustAdjustStrike REs
            path: new fields.StringField({ blank: true }),
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
    override applyAELike(): void {
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
                            { materials }: { materials?: Set<MaterialDamageEffect> }
                        ): void => {
                            if (!["add", "subtract", "remove"].includes(this.mode)) {
                                return this.failValidation(
                                    'A strike adjustment of material effects must be used with the "add", "subtract", or "remove" mode.'
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

                            const rangeIncrement = weapon.rangeIncrement;
                            if (typeof rangeIncrement !== "number") {
                                return this.failValidation(
                                    "A weapon that meets the definition lacks a range increment."
                                );
                            }

                            const newRangeIncrement = this.getNewValue(rangeIncrement, change);
                            weapon.system.range = newRangeIncrement as WeaponRangeIncrement;
                            return;
                        },
                    };
                case "traits":
                    return {
                        adjustTraits: (weapon: WeaponPF2e | MeleePF2e, traits: ActionTrait[]): void => {
                            if (!["add", "subtract", "remove"].includes(this.mode)) {
                                return this.failValidation(
                                    'A strike adjustment of traits must be used with the "add", "subtract", or "remove" mode.'
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
                                    'A strike adjustment of weapon traits must be used with the "add", "subtract", or "remove" mode.'
                                );
                            }
                            if (!objectHasKey(CONFIG.PF2E.weaponTraits, change)) {
                                return this.failValidation(`"${change}" is not a recognized weapon trait.`);
                            }
                            if (!definition.test(weapon.getRollOptions("item"))) {
                                return;
                            }

                            // Don't apply the versatile or modular trait to the basic unarmed attack
                            if (weapon.slug === "basic-unarmed" && /^(?:modular|versatile)/.test(change)) {
                                return;
                            }

                            const traits = weapon.system.traits.value;

                            // If the weapon already has a trait of the same type but a different value, we need to check
                            // if the new trait is better than the existing one and, if it is, replace it
                            const annotatedTraitMatch = change.match(/^([-a-z]*)-(\d*d?\d+)$/);
                            if (this.mode === "add" && annotatedTraitMatch) {
                                const changeBaseTrait = annotatedTraitMatch[1];
                                const changeValue = annotatedTraitMatch[2];

                                const traitRegex = new RegExp(`${changeBaseTrait}-(\\d*d?\\d*)`);
                                const existingTraitMatch = traits
                                    .map((trait) => trait.match(traitRegex))
                                    .find((match) => !!match);
                                if (existingTraitMatch) {
                                    const existingTrait = existingTraitMatch[1];
                                    const existingValue = AdjustStrikeRuleElement.getTraitScore(existingTrait);
                                    const changeTraitScore = AdjustStrikeRuleElement.getTraitScore(changeValue);

                                    // If the new trait's score is higher than the existing trait's score, then remove
                                    // the existing one otherwise just return out as we don't want to add the new
                                    // (lesser) trait
                                    if (changeTraitScore > existingValue) {
                                        traits.findSplice((trait) => trait === existingTraitMatch[0], change);
                                    }

                                    return;
                                }
                            }

                            if (this.mode === "add" && !traits.includes(change)) {
                                traits.push(change);
                            } else if (this.mode !== "add" && traits.includes(change)) {
                                traits.splice(traits.indexOf(change), 1);
                            }
                        },
                    };
                case "property-runes":
                    return {
                        adjustWeapon: (weapon: WeaponPF2e | MeleePF2e): void => {
                            if (weapon.isOfType("melee")) return; // Currently not supported

                            if (!["add", "subtract", "remove"].includes(this.mode)) {
                                return this.failValidation(
                                    'A strike adjustment of weapon property runes must be used with the "add", "subtract", or "remove" mode.'
                                );
                            }
                            const runeSlug = sluggify(String(change), { camel: "dromedary" });
                            if (!objectHasKey(CONFIG.PF2E.weaponPropertyRunes, runeSlug)) {
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

                            weapon.system.runes.property = prunePropertyRunes(propertyRunes);
                        },
                    };
            }
        })();

        this.actor.synthetics.strikeAdjustments.push(adjustment);
    }

    /** Score the trait value. If it's a dice roll, use the average roll, otherwise just use the number */
    static getTraitScore(traitValue: string): number {
        const traitValueMatch = traitValue.match(/(\d*)d(\d+)/);
        return traitValueMatch
            ? Number(traitValueMatch[1] || 1) * ((Number(traitValueMatch[2]) + 1) / 2)
            : Number(traitValue);
    }
}

interface AdjustStrikeRuleElement
    extends AELikeRuleElement<AdjustStrikeSchema>,
        ModelPropsFromSchema<AdjustStrikeSchema> {}

type AdjustStrikeSchema = Omit<AELikeSchema, "value"> & {
    /** The property of the strike to adjust */
    property: StringField<AdjustStrikeProperty, AdjustStrikeProperty, true, false, false>;
    /** The definition of the strike in terms of its item (weapon) roll options */
    definition: PredicateField;
    value: ResolvableValueField<true, false, false>;
};

type AdjustStrikeProperty = SetElement<(typeof AdjustStrikeRuleElement)["VALID_PROPERTIES"]>;

interface AdjustStrikeSource extends Exclude<AELikeSource, "path"> {
    property?: unknown;
    definition?: unknown;
}

export { AdjustStrikeRuleElement };
