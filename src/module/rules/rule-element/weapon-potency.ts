import { ActorPF2e } from "@actor";
import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression.ts";
import { ActorType } from "@actor/data/index.ts";
import { ItemPF2e, WeaponPF2e } from "@item";
import { RuleElementOptions, RuleElementPF2e, RuleElementSource } from "./index.ts";
import { PotencySynthetic } from "../synthetics.ts";

/**
 * Copies potency runes from the weapon its attached to, to another weapon based on a predicate.
 * @category RuleElement
 */
export class WeaponPotencyRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    selector: string;

    constructor(data: WeaponPotencySource, item: ItemPF2e<ActorPF2e>, options?: RuleElementOptions) {
        super(data, item, options);
        this.selector = String(data.selector);
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const { weaponPotency } = this.actor.synthetics;
        const selector = this.resolveInjectedProperties(this.selector);
        const { item } = this;
        const potencyValue = this.data.value ?? (item instanceof WeaponPF2e ? item.system.potencyRune.value : 0);
        const value = this.resolveValue(potencyValue);
        if (selector && typeof value === "number") {
            const bonusType = ABP.isEnabled(this.actor) ? "potency" : "item";

            const label = this.getReducedLabel();
            const potency: PotencySynthetic = { label, bonus: value, type: bonusType, predicate: this.predicate };
            const synthetics = (weaponPotency[selector] ??= []);
            synthetics.push(potency);
        } else {
            this.failValidation("Weapon potency requires at least a selector field and a non-empty value field");
        }
    }
}

interface WeaponPotencySource extends RuleElementSource {
    selector?: unknown;
}
