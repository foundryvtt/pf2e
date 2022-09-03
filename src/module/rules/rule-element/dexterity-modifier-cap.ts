import type { CharacterPF2e, NPCPF2e } from "@actor";
import { ActorType } from "@actor/data";
import { RuleElementPF2e } from "./";

/**
 * @category RuleElement
 */
class DexterityModifierCapRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    override beforePrepareData(): void {
        if (!this.test()) return;

        const value = this.resolveValue(this.data.value);
        if (typeof value === "number") {
            this.actor.synthetics.dexterityModifierCaps.push({
                value,
                source: this.label,
            });
        } else {
            console.warn("PF2E | Dexterity modifier cap requires at least a label field or item name, and a value");
        }
    }
}

interface DexterityModifierCapRuleElement extends RuleElementPF2e {
    get actor(): CharacterPF2e | NPCPF2e;
}

export { DexterityModifierCapRuleElement };
