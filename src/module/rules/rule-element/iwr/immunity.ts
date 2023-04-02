import { ImmunityData } from "@actor/data/iwr";
import { ImmunityType } from "@actor/types";
import { ArrayField, ModelPropsFromSchema, StringField } from "types/foundry/common/data/fields.mjs";
import { IWRRuleElement, IWRRuleSchema } from "./base";

const { fields } = foundry.data;

/** @category RuleElement */
class ImmunityRuleElement extends IWRRuleElement<ImmunityRuleSchema> {
    static override defineSchema(): ImmunityRuleSchema {
        return {
            ...super.defineSchema(),
            exceptions: new fields.ArrayField(
                new fields.StringField({ required: true, blank: false, choices: this.dictionary, initial: undefined })
            ),
        };
    }

    static override get dictionary(): Record<ImmunityType, string> {
        return CONFIG.PF2E.immunityTypes;
    }

    get property(): ImmunityData[] {
        return this.actor.system.attributes.immunities;
    }

    getIWR(): ImmunityData[] {
        return this.type
            .map(
                (t): ImmunityData =>
                    new ImmunityData({
                        type: t,
                        exceptions: this.exceptions,
                        source: this.label,
                    })
            )
            .filter((immunity) => {
                const existing = this.property.find((e) => e.type === immunity.type);
                return (
                    this.mode === "remove" ||
                    !(
                        existing?.type === immunity.type &&
                        existing.exceptions.every((x) => immunity.exceptions.includes(x))
                    )
                );
            });
    }
}

interface ImmunityRuleElement extends IWRRuleElement<ImmunityRuleSchema>, ModelPropsFromSchema<ImmunityRuleSchema> {
    // Just a string at compile time, but ensured by parent class at runtime
    type: ImmunityType[];

    // Typescript 4.9 doesn't fully resolve conditional types, so it is redefined here
    exceptions: ImmunityType[];
}

type ImmunityRuleSchema = Omit<IWRRuleSchema, "exceptions"> & {
    exceptions: ArrayField<StringField<ImmunityType, ImmunityType, true, false, false>>;
};

export { ImmunityRuleElement };
