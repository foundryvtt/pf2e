import { ActorPF2e } from "@actor";
import { ModifierAdjustment } from "@actor/modifiers";
import { ItemPF2e } from "@item";
import { DamageType } from "@system/damage/types";
import { DAMAGE_TYPES } from "@system/damage/values";
import { PredicatePF2e } from "@system/predication";
import { setHasElement } from "@util";
import {
    ArrayField,
    BooleanField,
    ModelPropsFromSchema,
    NumberField,
    StringField,
} from "types/foundry/common/data/fields.mjs";
import { RuleElementOptions } from "./";
import { AELikeData, AELikeRuleElement, AELikeSchema, AELikeSource } from "./ae-like";

const { fields } = foundry.data;

/** Adjust the value of a modifier, change its damage type (in case of damage modifiers) or suppress it entirely */
class AdjustModifierRuleElement extends AELikeRuleElement<AdjustModifierSchema> {
    /** The number of times this adjustment has been applied */
    applications = 0;

    constructor(data: AdjustModifierSource, item: ItemPF2e<ActorPF2e>, options?: RuleElementOptions) {
        data.path = "ignore"; // Maybe this shouldn't subclass AELikeRuleElement

        if (data.suppress) {
            data.mode = "override";
            data.value = 0;
            data.priority ??= 99; // Try to apply last
        }

        super({ ...data, phase: "beforeDerived" }, item, options);

        if (typeof data.selector === "string" && this.selectors.length === 0) {
            this.selectors = [data.selector];
        }

        this.suppress ??= false;
        this.maxApplications ??= Infinity;
    }

    static override defineSchema(): AdjustModifierSchema {
        return {
            ...super.defineSchema(),
            // `path` isn't used for AdjustModifier REs
            path: new fields.StringField({ blank: true }),
            selector: new fields.StringField({ required: false, blank: false, initial: undefined }),
            selectors: new fields.ArrayField(new fields.StringField({ required: true, blank: false })),
            relabel: new fields.StringField({ required: false, nullable: true, blank: false, initial: undefined }),
            damageType: new fields.StringField({ required: false, nullable: true, blank: false, initial: null }),
            suppress: new fields.BooleanField({ required: false, nullable: true, initial: undefined }),
            maxApplications: new fields.NumberField({ required: false, nullable: true, initial: undefined }),
        };
    }

    protected override _validateModel(data: Record<string, unknown>): void {
        super._validateModel(data);

        if (!["string", "number"].includes(typeof data.value) && !this.isBracketedValue(data.value)) {
            throw Error("`value` must be a string, number, or bracketed value");
        }

        if (data.suppress === true && typeof data.maxApplications === "number") {
            throw Error("use of `maxApplications` in combination with `suppress` is not currently supported");
        }
    }

    /** Instead of applying the change directly to a property path, defer it to a synthetic */
    override applyAELike(): void {
        this.validateData();
        if (this.ignored) return;

        const adjustment: ModifierAdjustment = {
            slug: this.slug,
            predicate: new PredicatePF2e(this.resolveInjectedProperties(deepClone([...this.predicate]))),
            suppress: this.suppress,
            getNewValue: (current: number): number => {
                const change = this.resolveValue();
                if (typeof change !== "number") {
                    this.failValidation("value does not resolve to a number");
                    return current;
                } else if (this.ignored) {
                    return current;
                }

                this.applications += 1;
                if (this.applications === this.maxApplications) {
                    this.ignored = true;
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

interface AdjustModifierRuleElement
    extends AELikeRuleElement<AdjustModifierSchema>,
        ModelPropsFromSchema<AdjustModifierSchema> {
    data: AELikeData;

    suppress: boolean;
    maxApplications: number;
}

type AdjustModifierSchema = AELikeSchema & {
    /** An optional relabeling of the adjusted modifier */
    relabel: StringField<string, string, false, true, false>;
    selector: StringField<string, string, false, false, false>;
    selectors: ArrayField<StringField<string, string, true, false, false>>;
    damageType: StringField<string, string, false, true, true>;
    /** Rather than changing a modifier's value, ignore it entirely */
    suppress: BooleanField<boolean, boolean, false, true, false>;
    /** The maximum number of times this adjustment can be applied */
    maxApplications: NumberField<number, number, false, true, false>;
};

interface AdjustModifierSource extends Exclude<AELikeSource, "path"> {
    selector?: unknown;
    selectors?: unknown;
    relabel?: unknown;
    damageType?: unknown;
    suppress?: unknown;
}

export { AdjustModifierRuleElement };
