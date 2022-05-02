import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { ModifierAdjustment } from "@actor/modifiers";
import { DamageType, DAMAGE_TYPES } from "@system/damage";
import { PredicatePF2e } from "@system/predication";
import { isObject, setHasElement } from "@util";
import { RuleElementOptions } from "./";
import { AELikeData, AELikeRuleElement, AELikeSource } from "./ae-like";

class AdjustModifierRuleElement extends AELikeRuleElement {
    protected static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    /** An optional relabeling of the adjusted modifier */
    relabel?: string;

    selectors: string[];

    constructor(data: AdjustModifierSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super({ ...data, phase: "beforeDerived", priority: data.priority ?? 90 }, item, options);

        if (typeof data.relabel === "string") {
            this.relabel = data.relabel;
        }

        this.data.predicate = new PredicatePF2e(this.data.predicate);
        this.selectors =
            typeof this.data.selector === "string"
                ? [this.data.selector]
                : Array.isArray(this.data.selectors)
                ? this.data.selectors
                : [];
    }

    protected override validateData(): void {
        if (this.ignored) return;
        const tests = {
            selectors:
                Array.isArray(this.selectors) &&
                this.selectors.length > 0 &&
                this.selectors.every((s) => typeof s === "string"),
            slug: typeof this.slug === "string" || this.slug === null,
            predicate: this.predicate.isValid,
            mode: AELikeRuleElement.CHANGE_MODES.includes(String(this.mode)),
            value: ["string", "number"].includes(typeof this.value) || isObject(this.value),
        };

        for (const [key, result] of Object.entries(tests)) {
            if (!result) this.warn(key);
        }
    }

    /** Instead of applying the change directly to a property path, defer it to a synthetic */
    override applyAELike(): void {
        this.validateData();
        if (this.ignored) return;

        const adjustment: ModifierAdjustment = {
            slug: this.slug,
            predicate: this.predicate,
            getNewValue: (current: number): number => {
                const change = this.resolveValue();
                if (typeof change !== "number") {
                    this.failValidation("value does not resolve to a number");
                    return current;
                }

                return this.getNewValue(current, change);
            },
            getDamageType: (current: DamageType | null): DamageType | null => {
                if (!this.data.damageType) return current;

                const damageType = this.resolveInjectedProperties(this.data.damageType);
                if (!setHasElement(DAMAGE_TYPES, damageType)) {
                    this.failValidation(`${damageType} is an unrecognized damage type.`);
                    return current;
                }

                return damageType;
            },
        };
        if (this.relabel) adjustment.relabel = this.relabel;

        for (const selector of this.selectors) {
            const adjustments = (this.actor.synthetics.modifierAdjustments[selector] ??= []);
            adjustments.push(adjustment);
        }
    }
}

interface AdjustModifierRuleElement extends AELikeRuleElement {
    data: AdjustModifierData;
}

interface AdjustModifierSource extends Exclude<AELikeSource, "path"> {
    relabel?: unknown;
    damageType?: unknown;
    selectors?: unknown;
}

interface AdjustModifierData extends Exclude<AELikeData, "path"> {
    predicate: PredicatePF2e;
    selectors: string[];
    slug: string | null;
    damageType?: DamageType;
}

export { AdjustModifierRuleElement };
