import { ImmunityData } from "@actor/data/iwr.ts";
import { ImmunityType } from "@actor/types.ts";
import type { ArrayField, StringField } from "types/foundry/common/data/fields.d.ts";
import { IWRRuleElement, IWRRuleSchema } from "./base.ts";

/** @category RuleElement */
class ImmunityRuleElement extends IWRRuleElement<ImmunityRuleSchema> {
    /** Immunities don't take values */
    readonly value = null;

    static override defineSchema(): ImmunityRuleSchema {
        const { fields } = foundry.data;
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
