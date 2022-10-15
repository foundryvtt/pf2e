import { LabeledWeakness, WeaknessType } from "@actor/data/base";
import { IWRRuleElement } from "./base";

/** @category RuleElement */
class WeaknessRuleElement extends IWRRuleElement {
    dictionary = CONFIG.PF2E.weaknessTypes;

    get property(): LabeledWeakness[] {
        return this.actor.system.traits.dv;
    }

    getIWR(value: number): LabeledWeakness[] {
        const weaknesses = this.property;
        for (const weaknessType of this.type) {
            const current = weaknesses.find((w) => w.type === weaknessType);
            if (current) {
                if (this.data.override) {
                    weaknesses.splice(weaknesses.indexOf(current), 1);
                } else {
                    current.value = Math.max(current.value, value);
                    this.type.splice(this.type.indexOf(weaknessType), 1);
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

interface WeaknessRuleElement extends IWRRuleElement {
    type: WeaknessType[];
}

export { WeaknessRuleElement };
