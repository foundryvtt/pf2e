import { LabeledResistance, ResistanceType } from "@actor/data/base";
import { IWRRuleElement, IWRRuleElementData } from "./base";

/** @category RuleElement */
class ResistanceRuleElement extends IWRRuleElement {
    dictionary = CONFIG.PF2E.resistanceTypes;

    get property(): LabeledResistance[] {
        return this.actor.data.data.traits.dr;
    }

    validate(value: unknown): boolean {
        return (
            this.data.type in this.dictionary &&
            typeof value == "number" &&
            value > 0 &&
            (!this.data.except || typeof this.data.except === "string")
        );
    }

    getIWR(value: number): LabeledResistance {
        const resistances = this.property;
        const current = resistances.find((resistance) => (resistance.type = this.data.type));
        if (current)
            this.data.override
                ? resistances.splice(resistances.indexOf(current), 1)
                : (current.value = Math.max(current.value, value));
        return {
            label: this.dictionary[this.data.type],
            type: this.data.type,
            value,
            exceptions: this.data.except,
        };
    }
}

interface ResistanceRuleElement extends IWRRuleElement {
    data: ResistanceData;
}

interface ResistanceData extends IWRRuleElementData {
    type: ResistanceType;
}

export { ResistanceRuleElement };
