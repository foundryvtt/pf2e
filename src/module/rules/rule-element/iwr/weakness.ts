import { Weakness } from "@actor/data/iwr.ts";
import { WeaknessType } from "@actor/types.ts";
import type { StrictArrayField } from "@system/schema-data-fields.ts";
import * as R from "remeda";
import { ResolvableValueField } from "../data.ts";
import { IWRException, IWRExceptionField, IWRRuleElement, IWRRuleSchema } from "./base.ts";

/** @category RuleElement */
class WeaknessRuleElement extends IWRRuleElement<WeaknessRuleSchema> {
    static override defineSchema(): WeaknessRuleSchema {
        return {
            ...super.defineSchema(),
            value: new ResolvableValueField({ required: true, nullable: false, initial: undefined }),
            exceptions: this.createExceptionsField(this.dictionary),
        };
    }

    static override get dictionary(): Record<WeaknessType, string> {
        return CONFIG.PF2E.weaknessTypes;
    }

    get property(): Weakness[] {
        return this.actor.system.attributes.weaknesses;
    }

    getIWR(value: number): Weakness[] {
        if (value <= 0) return [];

        const weaknesses = this.property;

        for (const weaknessType of [...this.type]) {
            const current = weaknesses.find(
                (w) =>
                    w.type === weaknessType &&
                    R.equals(w.exceptions, this.exceptions) &&
                    R.equals(w.definition, this.definition ?? null),
            );
            if (current) {
                if (this.override) {
                    weaknesses.splice(weaknesses.indexOf(current), 1);
                } else if (this.mode !== "remove") {
                    current.value = Math.max(current.value, value);
                    current.source = this.label;
                    this.type.splice(this.type.indexOf(weaknessType), 1);
                }
            }
        }

        return this.type.map(
            (t) =>
                new Weakness({
                    type: t,
                    customLabel: t === "custom" ? this.label : null,
                    definition: this.definition,
                    value,
                    exceptions: this.exceptions,
                    source: this.item.name,
                }),
        );
    }
}

interface WeaknessRuleElement extends IWRRuleElement<WeaknessRuleSchema>, ModelPropsFromSchema<WeaknessRuleSchema> {
    // Just a string at compile time, but ensured by parent class at runtime
    type: WeaknessType[];

    // Typescript 4.9 doesn't fully resolve conditional types, so it is redefined here
    exceptions: IWRException<WeaknessType>[];
}

type WeaknessRuleSchema = Omit<IWRRuleSchema, "exceptions"> & {
    value: ResolvableValueField<true, false, false>;
    exceptions: StrictArrayField<IWRExceptionField>;
};

export { WeaknessRuleElement };
