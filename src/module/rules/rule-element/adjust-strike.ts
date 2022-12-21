import { ActorType } from "@actor/data";
import { ItemPF2e, MeleePF2e, WeaponPF2e } from "@item";
import { ActionTrait } from "@item/action/data";
import { WeaponMaterialEffect, WeaponRangeIncrement } from "@item/weapon/types";
import { WEAPON_MATERIAL_EFFECTS } from "@item/weapon/values";
import { PredicatePF2e } from "@system/predication";
import { ErrorPF2e, objectHasKey, setHasElement } from "@util";
import { StrikeAdjustment } from "../synthetics";
import { AELikeData, AELikeRuleElement, AELikeSource } from "./ae-like";
import { RuleElementOptions } from "./base";

class AdjustStrikeRuleElement extends AELikeRuleElement {
    protected static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    private static VALID_PROPERTIES = new Set(["materials", "range-increment", "traits", "weapon-traits"] as const);

    /** The property of the strike to adjust */
    private property: SetElement<typeof AdjustStrikeRuleElement["VALID_PROPERTIES"]> | null;

    /** The definition of the strike in terms of its item (weapon) roll options */
    private definition: PredicatePF2e;

    constructor(data: AdjustStrikeSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super({ ...data, predicate: data.predicate ?? {}, phase: "beforeDerived", priority: 110 }, item, options);

        this.property = setHasElement(AdjustStrikeRuleElement.VALID_PROPERTIES, data.property) ? data.property : null;
        this.definition = new PredicatePF2e(Array.isArray(data.definition) ? data.definition : []);
    }

    protected override validateData(): void {
        const tests = {
            property: setHasElement(AdjustStrikeRuleElement.VALID_PROPERTIES, this.property),
            predicate: this.predicate.isValid,
            definition: this.definition.isValid,
            mode: objectHasKey(AELikeRuleElement.CHANGE_MODES, this.data.mode),
            value: ["string", "number"].includes(typeof this.value),
        };

        for (const [key, result] of Object.entries(tests)) {
            if (!result) this.warn(key);
        }
    }

    /** Instead of applying the change directly to a property path, defer it to a synthetic */
    override applyAELike(): void {
        this.validateData();
        if (!this.test()) return;

        const change = this.resolveValue();

        const adjustment = ((): StrikeAdjustment => {
            if (!this.property) throw ErrorPF2e("Unexpected error applying adjustment");

            const definition = this.resolveInjectedProperties(this.definition);

            switch (this.property) {
                case "materials":
                    return {
                        adjustDamageRoll: (
                            weapon: WeaponPF2e | MeleePF2e,
                            { materials }: { materials?: Set<WeaponMaterialEffect> }
                        ): void => {
                            if (!["add", "subtract", "remove"].includes(this.mode)) {
                                return this.failValidation(
                                    'A strike adjustment of material effects must be used with the "add", "subtract", or "remove" mode.'
                                );
                            }
                            if (!definition.test(weapon.getRollOptions("item"))) {
                                return;
                            }
                            if (!setHasElement(WEAPON_MATERIAL_EFFECTS, change)) {
                                return this.failValidation(`"${change} is not a supported weapon material effect.`);
                            }

                            const method = this.mode === "add" ? "add" : "delete";
                            materials?.[method](change);
                        },
                    };
                case "range-increment":
                    return {
                        adjustWeapon: (weapon: Embedded<WeaponPF2e>): void => {
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
                                return this.failValidation(`"${change} is not a recognized action trait.`);
                            }
                            if (!definition.test(weapon.getRollOptions("item"))) {
                                return;
                            }

                            if (this.mode === "add" && !traits.includes(change)) {
                                traits.push(change);
                            } else if (["subtract", "remove"].includes(this.mode) && traits.includes(change)) {
                                traits.splice(traits.indexOf(change));
                            }
                        },
                    };
                case "weapon-traits":
                    return {
                        adjustWeapon: (weapon: Embedded<WeaponPF2e>): void => {
                            if (!["add", "subtract", "remove"].includes(this.mode)) {
                                return this.failValidation(
                                    'A strike adjustment of weapon traits must be used with the "add", "subtract", or "remove" mode.'
                                );
                            }
                            if (!objectHasKey(CONFIG.PF2E.weaponTraits, change)) {
                                return this.failValidation(`"${change} is not a recognized weapon trait.`);
                            }
                            if (!definition.test(weapon.getRollOptions("item"))) {
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
                                    const existingTraitScore = getTraitScore(existingTraitMatch[1]);
                                    const changeTraitScore = getTraitScore(changeValue);

                                    // If the new trait's score is higher than the existing trait's score, then remove
                                    // the existing one otherwise just return out as we don't want to add the new
                                    // (lesser) trait
                                    if (changeTraitScore > existingTraitScore) {
                                        traits.findSplice((trait) => trait === existingTraitMatch[0]);
                                    }

                                    return;
                                }
                            }

                            if (this.mode === "add" && !traits.includes(change)) {
                                traits.push(change);
                            } else if (traits.includes(change)) {
                                traits.splice(traits.indexOf(change));
                            }
                        },
                    };
            }
        })();

        this.actor.synthetics.strikeAdjustments.push(adjustment);
    }
}

/** Score the trait value. If it's a dice roll, use the average roll, otherwise just use the number */
function getTraitScore(traitValue: string) {
    const traitValueMatch = traitValue.match(/(\d*)d(\d+)/);
    return traitValueMatch
        ? Number(traitValueMatch[1] || 1) * ((Number(traitValueMatch[2]) + 1) / 2)
        : Number(traitValue);
}

interface AdjustStrikeRuleElement extends AELikeRuleElement {
    data: AdjustStrikeData;
}

interface AdjustStrikeData extends Exclude<AELikeData, "path"> {
    /** Whether the actor is eligible to receive the strike adjustment */
    predicate: PredicatePF2e;
}

interface AdjustStrikeSource extends Exclude<AELikeSource, "path"> {
    property?: unknown;
    definition?: unknown;
}

export { AdjustStrikeRuleElement };
