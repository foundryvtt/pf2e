import { Immunity } from "@actor/data/iwr.ts";
import { ImmunityType } from "@actor/types.ts";
import type { StrictArrayField } from "@system/schema-data-fields.ts";
import * as R from "remeda";
import { IWRException, IWRExceptionField, IWRRuleElement, IWRRuleSchema } from "./base.ts";

/** @category RuleElement */
class ImmunityRuleElement extends IWRRuleElement<ImmunityRuleSchema> {
    /** Immunities don't take values */
    readonly value = null;

    static override defineSchema(): ImmunityRuleSchema {
        return {
            ...super.defineSchema(),
            exceptions: this.createExceptionsField(this.dictionary),
        };
    }

    static override get dictionary(): Record<ImmunityType, string> {
        return CONFIG.PF2E.immunityTypes;
    }

    get property(): Immunity[] {
        return this.actor.system.attributes.immunities;
    }

    getIWR(): Immunity[] {
        const immunities = this.property;

        return this.type
            .map(
                (t): Immunity =>
                    new Immunity({
                        type: t,
                        customLabel: t === "custom" ? this.label : null,
                        definition: this.definition,
                        exceptions: this.exceptions,
                        source: this.item.name,
                    }),
            )
            .filter((immunity) => {
                const existing = immunities.find(
                    (i) =>
                        i.type === immunity.type &&
                        (this.exceptions.length === 0 || R.equals(i.exceptions, this.exceptions)) &&
                        R.equals(i.definition, this.definition ?? null),
                );
                return !existing || this.mode === "remove";
            });
    }
}

interface ImmunityRuleElement extends IWRRuleElement<ImmunityRuleSchema>, ModelPropsFromSchema<ImmunityRuleSchema> {
    type: ImmunityType[];
    exceptions: IWRException<ImmunityType>[];
}

type ImmunityRuleSchema = Omit<IWRRuleSchema, "exceptions"> & {
    exceptions: StrictArrayField<IWRExceptionField<ImmunityType>>;
};

export { ImmunityRuleElement };
