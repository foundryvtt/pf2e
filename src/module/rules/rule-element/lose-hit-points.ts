import { CreaturePF2e } from "@actor";
import { ActorType } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { RuleElementPF2e, RuleElementSchema } from "./index.ts";
import type { BooleanField } from "types/foundry/common/data/fields.d.ts";
import { ResolvableValueField } from "./data.ts";

/** Reduce current hit points without applying damage */
class LoseHitPointsRuleElement extends RuleElementPF2e<LoseHitPointsRuleSchema> {
    static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    static override defineSchema(): LoseHitPointsRuleSchema {
        const { fields } = foundry.data;
        return {
            ...super.defineSchema(),
            value: new ResolvableValueField({ required: true, initial: undefined }),
            reevaluateOnUpdate: new fields.BooleanField({ required: false, initial: false }),
        };
    }

    override onCreate(actorUpdates: Record<string, unknown>): void {
        if (this.ignored) return;
        const value = Math.abs(Number(this.resolveValue(this.value)) || 0);
        const currentHP = this.actor._source.system.attributes.hp.value;
        actorUpdates["system.attributes.hp.value"] = Math.max(currentHP - value, 0);
    }

    override async preUpdate(changes: DeepPartial<ItemSourcePF2e>): Promise<void> {
        if (!this.reevaluateOnUpdate || this.ignored) return;
        const previousValue = Math.abs(Number(this.resolveValue(this.value)) || 0);
        const newItem = this.item.clone(changes);
        const rule = newItem.system.rules.find((r): r is LoseHitPointsSource => r.key === this.key);
        const newValue = Math.abs(
            Number(this.resolveValue(String(rule?.value), 0, { resolvables: { item: newItem } }))
        );
        const valueChange = newValue - previousValue;
        if (valueChange > 0) {
            const currentHP = this.actor._source.system.attributes.hp.value;
            await this.actor.update(
                { "system.attributes.hp.value": Math.max(currentHP - valueChange, 0) },
                { render: false }
            );
        }
    }
}

type LoseHitPointsSource = SourceFromSchema<LoseHitPointsRuleSchema>;

interface LoseHitPointsRuleElement
    extends RuleElementPF2e<LoseHitPointsRuleSchema>,
        ModelPropsFromSchema<LoseHitPointsRuleSchema> {
    get actor(): CreaturePF2e;
}

type LoseHitPointsRuleSchema = RuleElementSchema & {
    value: ResolvableValueField<true, false, false>;
    /**
     * Lost hitpoints should reevaluate on item update, with the parent actor losing the difference in HP between the
     * new and old values.
     */
    reevaluateOnUpdate: BooleanField<boolean, boolean, false, false, true>;
};

export { LoseHitPointsRuleElement };
