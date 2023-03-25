import { ResistanceData } from "@actor/data/iwr";
import { ResistanceType } from "@actor/types";
import { ArrayField, ModelPropsFromSchema, StringField } from "types/foundry/common/data/fields.mjs";
import { IWRRuleElement, IWRRuleSchema } from "./base";

const { fields } = foundry.data;

/** @category RuleElement */
class ResistanceRuleElement extends IWRRuleElement<ResistanceRuleSchema> {
    static override defineSchema(): ResistanceRuleSchema {
        const exceptionsOrDoubleVs = (): ArrayField<StringField<ResistanceType, ResistanceType, true, false, false>> =>
            new fields.ArrayField(
                new fields.StringField({
                    required: true as const,
                    blank: false,
                    choices: this.dictionary,
                    initial: undefined,
                })
            );

        return {
            ...super.defineSchema(),
            exceptions: exceptionsOrDoubleVs(),
            doubleVs: exceptionsOrDoubleVs(),
        };
    }

    static override get dictionary(): Record<ResistanceType, string> {
        return CONFIG.PF2E.resistanceTypes;
    }

    get property(): ResistanceData[] {
        return this.actor.system.attributes.resistances;
    }

    getIWR(value: number): ResistanceData[] {
        if (value <= 0) return [];

        const resistances = this.property;
        for (const resistanceType of [...this.type]) {
            const current = resistances.find((r) => r.type === resistanceType);
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
            (t): ResistanceData =>
                new ResistanceData({
                    type: t,
                    value,
                    exceptions: this.exceptions,
                    doubleVs: this.doubleVs,
                    source: this.label,
                })
        );
    }
}

interface ResistanceRuleElement
    extends IWRRuleElement<ResistanceRuleSchema>,
        ModelPropsFromSchema<ResistanceRuleSchema> {
    // Just a string at compile time, but ensured by parent class at runtime
    type: ResistanceType[];

    // Typescript 4.9 doesn't fully resolve conditional types, so it is redefined here
    exceptions: ResistanceType[];
}

type ResistanceRuleSchema = Omit<IWRRuleSchema, "exceptions"> & {
    exceptions: ArrayField<StringField<ResistanceType, ResistanceType, true, false, false>>;
    doubleVs: ArrayField<StringField<ResistanceType, ResistanceType, true, false, false>>;
};

export { ResistanceRuleElement };
