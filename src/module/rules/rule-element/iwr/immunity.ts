import { ImmunityType } from "@actor/data/base";
import { IWRRuleElement } from "./base";

/** @category RuleElement */
class ImmunityRuleElement extends IWRRuleElement {
    dictionary = CONFIG.PF2E.immunityTypes;

    get property(): ImmunityType[] {
        return this.actor.system.traits.di.value;
    }

    override validate(): boolean {
        return this.type.every((t) => t in this.dictionary);
    }

    getIWR(): ImmunityType[] {
        return this.type;
    }
}

interface ImmunityRuleElement extends IWRRuleElement {
    type: ImmunityType[];
}

export { ImmunityRuleElement };
