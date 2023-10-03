import { AutomaticBonusProgression as ABP } from "@actor/character/automatic-bonus-progression.ts";
import { ActorType } from "@actor/data/index.ts";
import { PotencySynthetic } from "../synthetics.ts";
import { RuleElementPF2e, RuleElementSchema } from "./index.ts";
import type { StringField } from "types/foundry/common/data/fields.d.ts";
import { ResolvableValueField } from "./data.ts";

/**
 * Copies potency runes from the weapon its attached to, to another weapon based on a predicate.
 * @category RuleElement
 */
class WeaponPotencyRuleElement extends RuleElementPF2e<WeaponPotencyRuleSchema> {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    static override defineSchema(): WeaponPotencyRuleSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            selector: new fields.StringField({ required: true, nullable: false, blank: false }),
            value: new ResolvableValueField({ required: true }),
        };
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const { weaponPotency } = this.actor.synthetics;
        const selector = this.resolveInjectedProperties(this.selector);
        const { item } = this;
        const potencyValue = this.value ?? (item.isOfType("weapon") ? item.system.potencyRune.value : 0);
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

interface WeaponPotencyRuleElement
    extends RuleElementPF2e<WeaponPotencyRuleSchema>,
        ModelPropsFromSchema<WeaponPotencyRuleSchema> {}

type WeaponPotencyRuleSchema = RuleElementSchema & {
    selector: StringField<string, string, true, false, false>;
    value: ResolvableValueField<true, false, false>;
};

export { WeaponPotencyRuleElement };
