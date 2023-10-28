import { Resistance } from "@actor/data/iwr.ts";
import { ResistanceType } from "@actor/types.ts";
import type { StrictArrayField } from "@system/schema-data-fields.ts";
import * as R from "remeda";
import { ResolvableValueField } from "../data.ts";
import { IWRException, IWRExceptionField, IWRRuleElement, IWRRuleSchema } from "./base.ts";

/** @category RuleElement */
class ResistanceRuleElement extends IWRRuleElement<ResistanceRuleSchema> {
    static override defineSchema(): ResistanceRuleSchema {
        return {
            ...super.defineSchema(),
            value: new ResolvableValueField({ required: true, nullable: false, initial: undefined }),
            exceptions: this.createExceptionsField(this.dictionary),
            doubleVs: this.createExceptionsField(this.dictionary),
        };
    }

    static override get dictionary(): Record<ResistanceType, string> {
        return CONFIG.PF2E.resistanceTypes;
    }

    get property(): Resistance[] {
        return this.actor.system.attributes.resistances;
    }

    getIWR(value: number): Resistance[] {
        if (value <= 0) return [];

        const resistances = this.property;
        for (const resistanceType of [...this.type]) {
            const current = resistances.find(
                (r) =>
                    r.type === resistanceType &&
                    R.equals(r.exceptions, this.exceptions) &&
                    R.equals(r.doubleVs, this.doubleVs) &&
                    R.equals(r.definition, this.definition ?? null),
            );
            if (current) {
                if (this.override) {
                    resistances.splice(resistances.indexOf(current), 1);
                } else if (this.mode !== "remove") {
                    current.value = Math.max(current.value, value);
                    current.source = this.label;
                    this.type.splice(this.type.indexOf(resistanceType), 1);
                }
            }
        }

        return this.type.map(
            (t): Resistance =>
                new Resistance({
                    type: t,
                    value,
                    customLabel: t === "custom" ? this.label : null,
                    definition: this.definition,
                    exceptions: this.exceptions,
                    doubleVs: this.doubleVs,
                    source: this.item.name,
                }),
        );
    }
}

interface ResistanceRuleElement
    extends IWRRuleElement<ResistanceRuleSchema>,
        ModelPropsFromSchema<ResistanceRuleSchema> {
    type: ResistanceType[];
    // Typescript 4.9 doesn't fully resolve conditional types, so it is redefined here
    exceptions: IWRException<ResistanceType>[];
}

type ResistanceRuleSchema = Omit<IWRRuleSchema, "exceptions"> & {
    value: ResolvableValueField<true, false, false>;
    exceptions: StrictArrayField<IWRExceptionField<ResistanceType>>;
    doubleVs: StrictArrayField<IWRExceptionField<ResistanceType>>;
};

export { ResistanceRuleElement };
