import type { DamageType } from "@system/damage/types.ts";
import { DAMAGE_DICE_FACES, DAMAGE_TYPES } from "@system/damage/values.ts";
import { StrictArrayField } from "@system/schema-data-fields.ts";
import { tupleHasValue } from "@util";
import * as R from "remeda";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import { AELikeRuleElement, type AELikeChangeMode } from "../ae-like.ts";
import type { ModelPropsFromRESchema, RuleElementSchema } from "../data.ts";
import { ResolvableValueField, RuleElementPF2e } from "../index.ts";
import { DamageAlteration } from "./alteration.ts";

/** Alter certain aspects of individual components (modifiers and dice) of a damage roll. */
class DamageAlterationRuleElement extends RuleElementPF2e<DamageAlterationSchema> {
    static override defineSchema(): DamageAlterationSchema {
        const fields = foundry.data.fields;

        return {
            ...super.defineSchema(),
            selectors: new StrictArrayField(
                new fields.StringField({
                    required: true,
                    nullable: false,
                    blank: false,
                    initial: undefined,
                }),
                {
                    required: true,
                    initial: undefined,
                    validate: (value) => {
                        if (Array.isArray(value) && value.length > 0) return true;
                        const failure = new foundry.data.validation.DataModelValidationFailure({
                            invalidValue: value,
                            message: "must have at least one",
                        });
                        throw new foundry.data.validation.DataModelValidationError(failure);
                    },
                },
            ),
            mode: new fields.StringField({
                required: true,
                choices: R.keys.strict(AELikeRuleElement.CHANGE_MODE_DEFAULT_PRIORITIES),
                initial: undefined,
            }),
            property: new fields.StringField({
                required: true,
                nullable: false,
                choices: ["damage-type", "dice-faces", "dice-number"],
            }),
            value: new ResolvableValueField({ required: true, nullable: true, initial: null }),
            relabel: new fields.StringField({ required: false, blank: false, nullable: true, initial: null }),
        };
    }

    override resolveValue(
        value: unknown,
        defaultValue: null,
        options: { resolvables: Record<string, unknown> },
    ): DamageAlterationValue | null;
    override resolveValue(
        value: unknown,
        defaultValue: null,
        options: { resolvables: Record<string, unknown> },
    ): number | string | null {
        const resolved = super.resolveValue(value, defaultValue, options);
        if (this.ignored || !(typeof resolved === "number" || typeof resolved === "string" || resolved === null)) {
            return null;
        }

        const damageTypes: Set<string> = DAMAGE_TYPES;
        const isValid = {
            "damage-type": typeof resolved === "string" && damageTypes.has(resolved),
            "dice-faces": resolved === null || tupleHasValue(DAMAGE_DICE_FACES, resolved),
            "dice-number": typeof resolved === "number" && Number.isInteger(resolved) && resolved.between(0, 99),
        };

        if (!isValid[this.property]) {
            const message = {
                "damage-type": `value: must be a damage type (resolved to ${resolved})`,
                "dice-faces": `value: must be one of 4, 6, 8, 10, and 12 (resolved to ${resolved})`,
                "dice-number": `value: must be a positive integer less than 100 (resolved to ${resolved})`,
            };
            this.failValidation(message[this.property]);
            return null;
        }

        return resolved;
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const alteration = new DamageAlteration(this);
        for (const selector of this.selectors) {
            const synthetics = (this.actor.synthetics.damageAlterations[selector] ??= []);
            synthetics.push(alteration);
        }
    }
}

interface DamageAlterationRuleElement
    extends RuleElementPF2e<DamageAlterationSchema>,
        ModelPropsFromRESchema<DamageAlterationSchema> {}

type DamageAlterationProperty = "dice-faces" | "dice-number" | "damage-type";

type DamageAlterationSchema = RuleElementSchema & {
    selectors: StrictArrayField<StringField<string, string, true, false, false>>;
    mode: StringField<AELikeChangeMode, AELikeChangeMode, true, false, false>;
    property: StringField<DamageAlterationProperty, DamageAlterationProperty, true, false, false>;
    value: ResolvableValueField<true, true, true>;
    /** An optional relabeling of the altered unit of damage */
    relabel: StringField<string, string, false, true, true>;
};

type DamageAlterationValue = DamageType | number;

export { DamageAlterationRuleElement };
export type { DamageAlterationProperty, DamageAlterationValue };
