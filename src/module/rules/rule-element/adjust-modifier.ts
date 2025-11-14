import { ModifierAdjustment } from "@actor/modifiers.ts";
import { DamageType } from "@system/damage/types.ts";
import { Predicate } from "@system/predication.ts";
import { StrictArrayField } from "@system/schema-data-fields.ts";
import { objectHasKey } from "@util";
import * as R from "remeda";
import { AELikeChangeMode, AELikeRuleElement } from "./ae-like.ts";
import { ModelPropsFromRESchema, ResolvableValueField } from "./data.ts";
import { RuleElement, RuleElementOptions, RuleElementSchema, RuleElementSource } from "./index.ts";
import fields = foundry.data.fields;

/** Adjust the value of a modifier, change its damage type (in case of damage modifiers) or suppress it entirely */
class AdjustModifierRuleElement extends RuleElement<AdjustModifierSchema> {
    constructor(source: AdjustModifierSource, options: RuleElementOptions) {
        if (source.suppress) source.mode = "override"; // Allow `suppress` as a shorthand without providing `mode`
        super(source, options);

        if (typeof source.selector === "string" && this.selectors.length === 0) {
            this.selectors = [source.selector];
        }

        this.suppress ??= false;
        this.maxApplications ??= Infinity;
    }

    static override defineSchema(): AdjustModifierSchema {
        const baseSchema = super.defineSchema();
        const PRIORITIES: Record<string, number | undefined> = AELikeRuleElement.CHANGE_MODE_DEFAULT_PRIORITIES;
        baseSchema.priority.initial = (d) => PRIORITIES[String(d.mode)] ?? 50;

        return {
            ...baseSchema,
            mode: new fields.StringField({
                required: true,
                choices: R.keys(AELikeRuleElement.CHANGE_MODE_DEFAULT_PRIORITIES),
                initial: undefined,
            }),
            selector: new fields.StringField({ required: false, blank: false, initial: undefined }),
            selectors: new StrictArrayField(new fields.StringField({ required: true, blank: false })),
            relabel: new fields.StringField({ required: false, nullable: true, blank: false, initial: null }),
            damageType: new fields.StringField({ required: false, nullable: true, blank: false, initial: null }),
            suppress: new fields.BooleanField({ required: false, nullable: false, initial: false }),
            maxApplications: new fields.NumberField({ required: false, nullable: true, initial: null }),
            value: new ResolvableValueField({ required: false, nullable: true, initial: null }),
        };
    }

    static override validateJoint(data: fields.SourceFromSchema<AdjustModifierSchema>): void {
        super.validateJoint(data);

        const { DataModelValidationError } = foundry.data.validation;
        if (data.suppress === true) {
            if (typeof data.maxApplications === "number") {
                throw new DataModelValidationError(
                    "  use of `maxApplications` in combination with `suppress` is not currently supported",
                );
            }
        } else if (data.value === null && !data.damageType) {
            throw new DataModelValidationError(
                "  value: must be provided unless damageType is provided or suppress is true",
            );
        }
    }

    /** Instead of applying the change directly to a property path, defer it to a synthetic */
    override beforePrepareData(): void {
        if (this.ignored) return;

        let predicate: Predicate | null = null;

        const adjustment: ModifierAdjustment = {
            slug: this.slug,
            test: (options): boolean => {
                // Lazy load the predicate and avoid constructing it again every time the adjustment is tested
                predicate ??= new Predicate(this.resolveInjectedProperties(fu.deepClone([...this.predicate])));
                return predicate.test([...options, ...this.item.getRollOptions("parent")]);
            },
            suppress: this.suppress,
            getNewValue: (current: number): number => {
                adjustment.applications ??= 0;
                if (this.value === null) return current;

                const change = this.resolveValue(this.value);
                if (typeof change !== "number" || Number.isNaN(change)) {
                    this.failValidation("value: must resolve to a number");
                    return current;
                } else if (this.ignored || adjustment.applications >= this.maxApplications) {
                    return current;
                }

                adjustment.applications += 1;
                return Math.trunc(AELikeRuleElement.getNewValue(this.mode, current, change));
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
            if (selector === "null") continue;

            const adjustments = (this.actor.synthetics.modifierAdjustments[selector] ??= []);
            adjustments.push(adjustment);
        }
    }
}

interface AdjustModifierRuleElement
    extends RuleElement<AdjustModifierSchema>,
        ModelPropsFromRESchema<AdjustModifierSchema> {
    suppress: boolean;
    maxApplications: number;
}

type AdjustModifierSchema = RuleElementSchema & {
    mode: fields.StringField<AELikeChangeMode, AELikeChangeMode, true, false, false>;
    /** An optional relabeling of the adjusted modifier */
    relabel: fields.StringField<string, string, false, true, true>;
    selector: fields.StringField<string, string, false, false, false>;
    selectors: fields.ArrayField<fields.StringField<string, string, true, false, false>>;
    damageType: fields.StringField<string, string, false, true, true>;
    /** Rather than changing a modifier's value, ignore it entirely */
    suppress: fields.BooleanField<boolean, boolean, false, false, true>;
    /** The maximum number of times this adjustment can be applied to a statistic */
    maxApplications: fields.NumberField<number, number, false, true, true>;
    value: ResolvableValueField<false, true, true>;
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
export type { AdjustModifierSource };
