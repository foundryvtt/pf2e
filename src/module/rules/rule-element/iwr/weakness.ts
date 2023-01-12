import { WeaknessData } from "@actor/data/iwr";
import { WeaknessType } from "@actor/types";
import { IWRRuleElement } from "./base";

/** @category RuleElement */
class WeaknessRuleElement extends IWRRuleElement {
    protected dictionary = CONFIG.PF2E.weaknessTypes;

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

interface WeaknessRuleElement extends IWRRuleElement {
    type: WeaknessType[];

    exceptions: WeaknessType[];
}

export { WeaknessRuleElement };
