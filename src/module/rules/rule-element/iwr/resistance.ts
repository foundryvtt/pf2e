import { LabeledResistance, ResistanceType } from "@actor/data/base";
import { IWRRuleElement, IWRRuleElementData } from "./base";

/** @category RuleElement */
class ResistanceRuleElement extends IWRRuleElement {
    dictionary = CONFIG.PF2E.resistanceTypes;

    get property(): LabeledResistance[] {
        return this.actor.system.traits.dr;
    }

    getIWR(value: number): LabeledResistance | null {
        const resistances = this.property;
        const current = resistances.find((resistance) => resistance.type === this.data.type);
        if (current) {
            if (this.data.override) {
                resistances.splice(resistances.indexOf(current), 1);
            } else {
                current.value = Math.max(current.value, value);
                return null;
            }
        }

        return {
            label: this.dictionary[this.data.type],
            type: this.data.type,
            value,
            exceptions: this.data.except ? game.i18n.localize(this.data.except) : undefined,
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
