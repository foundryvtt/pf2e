import { ImmunityData } from "@actor/data/iwr";
import { ImmunityType } from "@actor/types";
import { IWRRuleElement } from "./base";

/** @category RuleElement */
class ImmunityRuleElement extends IWRRuleElement {
    protected dictionary = CONFIG.PF2E.immunityTypes;

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
                return !(
                    existing?.type === immunity.type &&
                    existing.exceptions.every((x) => immunity.exceptions.includes(x))
                );
            });
    }
}

interface ImmunityRuleElement extends IWRRuleElement {
    type: ImmunityType[];

    exceptions: ImmunityType[];
}

export { ImmunityRuleElement };
