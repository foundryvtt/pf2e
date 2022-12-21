import { ActorType } from "@actor/data";
import { ModifierAdjustment } from "@actor/modifiers";
import { ItemPF2e } from "@item";
import { DamageType } from "@system/damage/types";
import { DAMAGE_TYPES } from "@system/damage/values";
import { isObject, objectHasKey, setHasElement } from "@util";
import { RuleElementOptions } from "./";
import { AELikeData, AELikeRuleElement, AELikeSource } from "./ae-like";

/** Adjust the value of a modifier, change its damage type (in case of damage modifiers) or suppress it entirely */
class AdjustModifierRuleElement extends AELikeRuleElement {
    protected static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    /** An optional relabeling of the adjusted modifier */
    relabel?: string;

    selectors: string[];

    damageType: string | null;

    suppress: boolean;

    constructor(data: AdjustModifierSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        if (data.suppress) {
            data.mode = "override";
            data.value = 0;
        }
        data.priority ??= 90;

        super({ ...data, phase: "beforeDerived" }, item, options);

        if (typeof data.relabel === "string") {
            this.relabel = data.relabel;
        }

        this.selectors =
            typeof data.selector === "string"
                ? [data.selector]
                : Array.isArray(data.selectors) && data.selectors.every((s): s is string => typeof s === "string")
                ? data.selectors
                : [];

        this.damageType = typeof data.damageType === "string" ? data.damageType : null;
        this.suppress = !!data.suppress;
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
            mode: objectHasKey(AELikeRuleElement.CHANGE_MODES, this.data.mode),
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
            suppress: this.suppress,
            getNewValue: (current: number): number => {
                const change = this.resolveValue();
                if (typeof change !== "number") {
                    this.failValidation("value does not resolve to a number");
                    return current;
                }

                return this.getNewValue(current, change);
            },
            getDamageType: (current: DamageType | null): DamageType | null => {
                if (!this.damageType) return current;

                const damageType = this.resolveInjectedProperties(this.damageType);
                if (!setHasElement(DAMAGE_TYPES, damageType)) {
                    this.failValidation(`${damageType} is an unrecognized damage type.`);
                    return current;
                }

                return damageType;
            },
        };

        if (this.relabel) {
            adjustment.relabel = this.resolveInjectedProperties(this.relabel).replace(/^[^:]+:\s*|\s*\([^)]+\)$/g, "");
        }

        for (const selector of this.selectors.map((s) => this.resolveInjectedProperties(s))) {
            const adjustments = (this.actor.synthetics.modifierAdjustments[selector] ??= []);
            adjustments.push(adjustment);
        }
    }
}

interface AdjustModifierRuleElement extends AELikeRuleElement {
    data: AELikeData;
}

interface AdjustModifierSource extends Exclude<AELikeSource, "path"> {
    selector?: unknown;
    selectors?: unknown;
    relabel?: unknown;
    damageType?: unknown;
    suppress?: unknown;
}

export { AdjustModifierRuleElement };
