import { WeaknessData } from "@actor/data/iwr.ts";
import { WeaknessType } from "@actor/types.ts";
import type { ArrayField, StringField } from "types/foundry/common/data/fields.d.ts";
import { ResolvableValueField } from "../data.ts";
import { IWRRuleElement, IWRRuleSchema } from "./base.ts";

/** @category RuleElement */
class WeaknessRuleElement extends IWRRuleElement<WeaknessRuleSchema> {
    static override defineSchema(): WeaknessRuleSchema {
        const { fields } = foundry.data;

        return {
            ...super.defineSchema(),
            value: new ResolvableValueField({ required: true, nullable: false, initial: undefined }),
            exceptions: new fields.ArrayField(
                new fields.StringField({ required: true, blank: false, choices: this.dictionary, initial: undefined })
            ),
        };
    }

    static override get dictionary(): Record<WeaknessType, string> {
        return CONFIG.PF2E.weaknessTypes;
    }

    get property(): WeaknessData[] {
        return this.actor.system.attributes.weaknesses;
    }

    getIWR(value: number): WeaknessData[] {
        if (value <= 0) return [];

        const weaknesses = this.property;

        for (const weaknessType of [...this.type]) {
            const current = weaknesses.find((w) => w.type === weaknessType);
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
                new WeaknessData({
                    type: t,
                    value,
                    exceptions: this.exceptions,
                    source: this.label,
                })
        );
    }
}

interface WeaknessRuleElement extends IWRRuleElement<WeaknessRuleSchema>, ModelPropsFromSchema<WeaknessRuleSchema> {
    // Just a string at compile time, but ensured by parent class at runtime
    type: WeaknessType[];

    // Typescript 4.9 doesn't fully resolve conditional types, so it is redefined here
    exceptions: WeaknessType[];
}

type WeaknessRuleSchema = Omit<IWRRuleSchema, "exceptions"> & {
    value: ResolvableValueField<true, false, false>;
    exceptions: ArrayField<StringField<WeaknessType, WeaknessType, true, false, false>>;
};

export { WeaknessRuleElement };
