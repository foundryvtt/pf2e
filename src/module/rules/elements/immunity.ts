import { RuleElementPF2e } from "../rule-element";
import { objectHasKey } from "@module/utils";

/** @category RuleElement */
export class ImmunityRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(): void {
        if (this.ignored) return;

        const immunity = this.resolveValue();
        if (!objectHasKey(CONFIG.PF2E.immunityTypes, immunity)) {
            console.warn(`PF2e System | Unrecognized immunity: ${immunity}`);
        }
        const immunities = this.actor.data.data.traits.di.value;
        if (!immunities.includes(immunity)) immunities.push(immunity);
    }
}
