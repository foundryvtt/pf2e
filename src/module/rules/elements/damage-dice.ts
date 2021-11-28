import { RuleElementPF2e } from "../rule-element";
import { RuleElementData, RuleElementSynthetics } from "../rules-data-definitions";
import { CharacterPF2e, NPCPF2e } from "@actor";
import { DamageDicePF2e } from "@module/modifiers";

/**
 * @category RuleElement
 */
export class DamageDiceRuleElement extends RuleElementPF2e {
    override onBeforePrepareData({ damageDice }: RuleElementSynthetics) {
        const value: Omit<DamageDiceRuleElementData, "key"> & { key?: string } = deepClone(this.data);
        delete value.key;
        if (this.data.value) {
            const bracketed = this.resolveValue(this.data.value);
            mergeObject(value, bracketed, { inplace: true, overwrite: true });
            delete value.value;
        }
        const selector = this.resolveInjectedProperties(value.selector);
        // In English (and in other languages when the same general form is used), labels patterned as
        // "Title: Subtitle (Parenthetical)" will be reduced to "Subtitle"
        // e.g., "Spell Effect: Ooze Form (Gelatinous Cube)" will become "Ooze Form"
        value.name = (this.data.name ?? this.label).replace(/^[^:]+:\s*|\s*\([^)]+\)$/g, "");
        value.label = this.label;

        if (selector && value.name && value) {
            const dice = new DamageDicePF2e(value as Required<DamageDiceRuleElementData>);
            damageDice[selector] = (damageDice[selector] || []).concat(dice);
        } else {
            console.warn("PF2E | Damage dice requires at least a selector field, and a label field or item name");
        }
    }
}

export interface DamageDiceRuleElement {
    data: DamageDiceRuleElementData;

    get actor(): CharacterPF2e | NPCPF2e;
}

interface DamageDiceRuleElementData extends RuleElementData {
    name?: string;
}
