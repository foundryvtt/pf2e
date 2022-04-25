import { ActorType } from "@actor/data";
import { ItemPF2e, WeaponPF2e } from "@item";
import { WeaponRangeIncrement } from "@item/weapon/data";
import { PredicatePF2e } from "@system/predication";
import { objectHasKey, setHasElement } from "@util";
import { AELikeRuleElement, AELikeData, AELikeSource } from "./ae-like";
import { RuleElementOptions } from "./base";

class AdjustStrikeRuleElement extends AELikeRuleElement {
    protected static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    private static VALID_PROPERTIES = new Set(["range-increment", "traits"] as const);

    /** The property of the strike to adjust */
    private property: SetElement<typeof AdjustStrikeRuleElement["VALID_PROPERTIES"]> | null;

    /** The definition of the strike in terms of its item (weapon) roll options */
    private definition: PredicatePF2e;

    constructor(data: AdjustStrikeSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super({ ...data, predicate: data.predicate ?? {}, phase: "beforeDerived", priority: 110 }, item, options);

        this.property = setHasElement(AdjustStrikeRuleElement.VALID_PROPERTIES, data.property) ? data.property : null;
        this.definition = new PredicatePF2e(data.definition instanceof Object ? data.definition : {});
    }

    protected override validateData(): void {
        const tests = {
            property: ["range-increment", "traits"].includes(this.property ?? ""),
            predicate: this.predicate.isValid,
            definition: this.definition.isValid,
            mode: AELikeRuleElement.CHANGE_MODES.includes(String(this.mode)),
            value: ["string", "number"].includes(typeof this.value),
        };

        for (const [key, result] of Object.entries(tests)) {
            if (!result) this.warn(key);
        }
    }

    /** Instead of applying the change directly to a property path, defer it to a synthetic */
    override applyAELike(): void {
        this.validateData();
        if (this.ignored) return;

        if (!this.data.predicate.test(this.actor.getRollOptions())) return;

        const change = this.resolveValue();

        const adjustment = {
            adjustStrike: (weapon: Embedded<WeaponPF2e>): void => {
                if (!this.definition.test(weapon.getRollOptions())) return;

                switch (this.property) {
                    case "range-increment": {
                        if (typeof change !== "number") {
                            return this.failValidation("Change value is not a number.");
                        }

                        const rangeIncrement = weapon.rangeIncrement;
                        if (typeof rangeIncrement !== "number") {
                            return this.failValidation("A weapon that meets the definition lacks a range increment.");
                        }

                        const newRangeIncrement = this.getNewValue(rangeIncrement, change);
                        weapon.data.data.range = newRangeIncrement as WeaponRangeIncrement;
                        return;
                    }
                    case "traits": {
                        if (this.mode !== "add") {
                            return this.failValidation('A strike adjustment of traits must be used with "add" mode.');
                        }
                        if (!objectHasKey(CONFIG.PF2E.weaponTraits, change)) {
                            return this.failValidation(`"${change} is not a recognized strike trait.`);
                        }
                        const { traits } = weapon.data.data;
                        if (!traits.value.includes(change)) traits.value.push(change);
                        return;
                    }
                }
            },
        };

        this.actor.synthetics.strikeAdjustments.push(adjustment);
    }
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
