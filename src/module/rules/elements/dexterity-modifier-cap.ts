import { CharacterPF2e, NPCPF2e } from "@actor";
import { RuleElementPF2e } from "../rule-element";

/**
 * @category RuleElement
 */
export class PF2DexterityModifierCapRuleElement extends RuleElementPF2e {
    override onBeforePrepareData() {
        if (!(this.actor instanceof CharacterPF2e || this.actor instanceof NPCPF2e)) return;
        const value = this.resolveValue(this.data.value);
        if (typeof value === "number") {
            this.actor.data.data.attributes.dexCap.push({
                value,
                source: this.label,
            });
        } else {
            console.warn("PF2E | Dexterity modifier cap requires at least a label field or item name, and a value");
        }
    }
}
