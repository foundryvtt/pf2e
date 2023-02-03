import { WeaknessData } from "@actor/data/iwr";
import { WeaknessType } from "@actor/types";
import { ArrayField, ModelPropsFromSchema, StringField } from "types/foundry/common/data/fields.mjs";
import { IWRRuleElement, IWRRuleSchema } from "./base";

const { fields } = foundry.data;

/** @category RuleElement */
class WeaknessRuleElement extends IWRRuleElement<WeaknessRuleSchema> {
    static override defineSchema(): WeaknessRuleSchema {
        return {
            ...super.defineSchema(),
            exceptions: new fields.ArrayField(
                new fields.StringField({ required: true, blank: false, choices: this.dictionary }),
                { nullable: false }
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
                } else {
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
    exceptions: ArrayField<StringField<WeaknessType>>;
};

export { WeaknessRuleElement };
