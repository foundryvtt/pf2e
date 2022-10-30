import { LabeledResistance, ResistanceType } from "@actor/data/base";
import { IWRRuleElement } from "./base";

/** @category RuleElement */
class ResistanceRuleElement extends IWRRuleElement {
    dictionary = CONFIG.PF2E.resistanceTypes;

    get property(): LabeledResistance[] {
        return this.actor.system.traits.dr;
    }

    getIWR(value: number): LabeledResistance[] {
        const resistances = this.property;

        for (const resistanceType of [...this.type]) {
            const current = resistances.find((r) => r.type === resistanceType);
            if (current) {
                if (this.data.override) {
                    resistances.splice(resistances.indexOf(current), 1);
                } else {
                    current.value = Math.max(current.value, value);
                    this.type.splice(this.type.indexOf(resistanceType), 1);
                }
            }
        }

        return this.type.map((t) => ({
            label: this.dictionary[t],
            type: t,
            value,
            exceptions: this.data.except ? game.i18n.localize(this.data.except) : undefined,
        }));
    }
}

interface ResistanceRuleElement extends IWRRuleElement {
    type: ResistanceType[];
}

export { ResistanceRuleElement };
