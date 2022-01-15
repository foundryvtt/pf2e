import { ImmunityType } from "@actor/data/base";
import { IWRRuleElement, IWRRuleElementData } from "./base";

/** @category RuleElement */
class ImmunityRuleElement extends IWRRuleElement {
    dictionary = CONFIG.PF2E.immunityTypes;

    get property(): ImmunityType[] {
        return this.actor.data.data.traits.di.value;
    }

    override validate(): boolean {
        return this.data.type in this.dictionary;
    }

    getIWR(): ImmunityType {
        return this.data.type;
    }
}

interface ImmunityRuleElement extends IWRRuleElement {
    data: ImmunityData;
}

interface ImmunityData extends IWRRuleElementData {
    type: ImmunityType;
}

export { ImmunityRuleElement };
