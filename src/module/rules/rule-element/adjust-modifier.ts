import { ModifierAdjustment } from "@actor/modifiers.ts";
import { DamageType } from "@system/damage/types.ts";
import { PredicatePF2e } from "@system/predication.ts";
import { objectHasKey } from "@util";
import type { ArrayField, BooleanField, NumberField, StringField } from "types/foundry/common/data/fields.d.ts";
import { AELikeChangeMode, AELikeRuleElement } from "./ae-like.ts";
import { ResolvableValueField } from "./data.ts";
import { RuleElementOptions, RuleElementPF2e, RuleElementSchema, RuleElementSource } from "./index.ts";

/** Adjust the value of a modifier, change its damage type (in case of damage modifiers) or suppress it entirely */
class AdjustModifierRuleElement extends RuleElementPF2e<AdjustModifierSchema> {
    /** The number of times this adjustment has been applied */
    applications = 0;

    constructor(source: AdjustModifierSource, options: RuleElementOptions) {
        if (source.suppress) {
            source.mode = "override";
            source.priority ??= 99; // Try to apply last
        } else if (objectHasKey(AELikeRuleElement.CHANGE_MODE_DEFAULT_PRIORITIES, source.mode)) {
            source.priority = AELikeRuleElement.CHANGE_MODE_DEFAULT_PRIORITIES[source.mode];
        }

        super(source, options);

        if (typeof source.selector === "string" && this.selectors.length === 0) {
            this.selectors = [source.selector];
        }

        this.suppress ??= false;
        this.maxApplications ??= Infinity;
    }

    static override defineSchema(): AdjustModifierSchema {
        const { fields } = foundry.data;

        return {
            ...super.defineSchema(),
            mode: new fields.StringField({
                required: true,
                choices: AELikeRuleElement.CHANGE_MODES,
                initial: undefined,
            }),
            selector: new fields.StringField({ required: false, blank: false, initial: undefined }),
            selectors: new fields.ArrayField(new fields.StringField({ required: true, blank: false })),
            relabel: new fields.StringField({ required: false, nullable: true, blank: false, initial: undefined }),
            damageType: new fields.StringField({ required: false, nullable: true, blank: false, initial: null }),
            suppress: new fields.BooleanField({ required: false, nullable: true, initial: undefined }),
            maxApplications: new fields.NumberField({ required: false, nullable: true, initial: undefined }),
            value: new ResolvableValueField({ required: false, nullable: false, initial: undefined }),
        };
    }

    static override validateJoint(data: Record<string, unknown>): void {
        super.validateJoint(data);

        const { DataModelValidationError } = foundry.data.validation;
        if (data.suppress === true) {
            if (typeof data.maxApplications === "number") {
                throw new DataModelValidationError(
                    "  use of `maxApplications` in combination with `suppress` is not currently supported"
                );
            }
        } else if (data.value === undefined) {
            throw new DataModelValidationError("  value: may not be undefined unless `suppress` is true");
        }
    }

    /** Instead of applying the change directly to a property path, defer it to a synthetic */
    override beforePrepareData(): void {
        if (this.ignored) return;

        const adjustment: ModifierAdjustment = {
            slug: this.slug,
            predicate: new PredicatePF2e(this.resolveInjectedProperties(deepClone([...this.predicate]))),
            suppress: this.suppress,
            getNewValue: (current: number): number => {
                const change = Number(this.resolveValue(this.value));
                if (Number.isNaN(change)) {
                    this.failValidation("value does not resolve to a number");
                    return current;
                } else if (this.ignored) {
                    return current;
                }

                this.applications += 1;
                if (this.applications === this.maxApplications) {
                    this.ignored = true;
                }

                const newValue = AELikeRuleElement.getNewValue(this.mode, current, change);
                if (newValue instanceof foundry.data.validation.DataModelValidationFailure) {
                    this.failValidation(newValue.asError().message);
                    return current;
                }
                return newValue;
            },
            getDamageType: (current: DamageType | null): DamageType | null => {
                if (!this.damageType) return current;

                const damageType = this.resolveInjectedProperties(this.damageType);
                if (!objectHasKey(CONFIG.PF2E.damageTypes, damageType)) {
                    this.failValidation(`${damageType} is an unrecognized damage type.`);
                    return current;
                }

                return damageType;
            },
        };

        if (this.relabel) {
            adjustment.relabel = this.getReducedLabel(this.resolveInjectedProperties(this.relabel));
        }

        for (const selector of this.selectors.map((s) => this.resolveInjectedProperties(s))) {
            const adjustments = (this.actor.synthetics.modifierAdjustments[selector] ??= []);
            adjustments.push(adjustment);
        }
    }
}

interface AdjustModifierRuleElement
    extends RuleElementPF2e<AdjustModifierSchema>,
        ModelPropsFromSchema<AdjustModifierSchema> {
    suppress: boolean;
    maxApplications: number;
}

type AdjustModifierSchema = RuleElementSchema & {
    mode: StringField<AELikeChangeMode, AELikeChangeMode, true, false, false>;
    /** An optional relabeling of the adjusted modifier */
    relabel: StringField<string, string, false, true, false>;
    selector: StringField<string, string, false, false, false>;
    selectors: ArrayField<StringField<string, string, true, false, false>>;
    damageType: StringField<string, string, false, true, true>;
    /** Rather than changing a modifier's value, ignore it entirely */
    suppress: BooleanField<boolean, boolean, false, true, false>;
    /** The maximum number of times this adjustment can be applied */
    maxApplications: NumberField<number, number, false, true, false>;
    value: ResolvableValueField<false, false, false>;
};

interface AdjustModifierSource extends RuleElementSource {
    mode?: unknown;
    selector?: unknown;
    selectors?: unknown;
    relabel?: unknown;
    damageType?: unknown;
    suppress?: unknown;
}

export { AdjustModifierRuleElement };
