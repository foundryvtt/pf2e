import { ResistanceData } from "@actor/data/iwr";
import { ResistanceType } from "@actor/types";
import { ItemPF2e } from "@item";
import { RuleElementOptions } from "../base";
import { IWRRuleElement, IWRRuleElementSource } from "./base";

/** @category RuleElement */
class ResistanceRuleElement extends IWRRuleElement {
    protected dictionary = CONFIG.PF2E.resistanceTypes;

    doubleVs: ResistanceType[];

    constructor(data: ResistanceRESource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        this.doubleVs =
            Array.isArray(data.doubleVs) && data.doubleVs.every((d): d is ResistanceType => d in this.dictionary)
                ? data.doubleVs
                : [];
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
                } else {
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

interface ResistanceRuleElement extends IWRRuleElement {
    type: ResistanceType[];

    exceptions: ResistanceType[];
}

interface ResistanceRESource extends IWRRuleElementSource {
    doubleVs?: unknown;
}

export { ResistanceRuleElement };
