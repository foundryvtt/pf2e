import type { ActorType, CreaturePF2e } from "@actor";
import type { ItemSourcePF2e } from "@item/base/data/index.ts";
import { RuleElement } from "./base.ts";
import { ModelPropsFromRESchema, ResolvableValueField, RuleElementSchema } from "./data.ts";
import fields = foundry.data.fields;

/** Reduce current hit points without applying damage */
class LoseHitPointsRuleElement extends RuleElement<LoseHitPointsRuleSchema> {
    static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    static override defineSchema(): LoseHitPointsRuleSchema {
        return {
            ...super.defineSchema(),
            value: new ResolvableValueField({ required: true, initial: undefined }),
            reevaluateOnUpdate: new fields.BooleanField({ required: false, initial: false }),
            recoverable: new fields.BooleanField({ required: false, initial: true }),
        };
    }

    override onCreate(actorUpdates: Record<string, unknown>): void {
        if (this.ignored) return;
        const value = Math.trunc(Math.abs(Number(this.resolveValue(this.value)) || 0));
        const currentHP = this.actor._source.system.attributes.hp.value;
        actorUpdates["system.attributes.hp.value"] = Math.max(currentHP - value, 0);
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const { actor } = this;
        if (!this.recoverable) {
            const value = Math.trunc(Math.abs(Number(this.resolveValue(this.value)) || 0));
            actor.system.attributes.hp.unrecoverable += value;
        }
    }

    override async preUpdate(changes: DeepPartial<ItemSourcePF2e>): Promise<void> {
        if (!this.reevaluateOnUpdate || this.ignored) return;
        const previousValue = Math.trunc(Math.abs(Number(this.resolveValue(this.value)) || 0));
        const newItem = this.item.clone(changes);
        const rule = newItem.system.rules.find((r): r is LoseHitPointsSource => r.key === this.key);
        const newValue = Math.trunc(
            Math.abs(Number(this.resolveValue(String(rule?.value), 0, { resolvables: { item: newItem } }))),
        );
        const valueChange = newValue - previousValue;
        if (valueChange > 0) {
            const currentHP = this.actor._source.system.attributes.hp.value;
            await this.actor.update(
                { "system.attributes.hp.value": Math.max(currentHP - valueChange, 0) },
                { render: false },
            );
        }
    }
}

type LoseHitPointsSource = fields.SourceFromSchema<LoseHitPointsRuleSchema>;

interface LoseHitPointsRuleElement
    extends RuleElement<LoseHitPointsRuleSchema>,
        ModelPropsFromRESchema<LoseHitPointsRuleSchema> {
    get actor(): CreaturePF2e;
}

type LoseHitPointsRuleSchema = RuleElementSchema & {
    value: ResolvableValueField<true, false, false>;
    /** Whether the lost hit points are recoverable while the parent item is present on the actor */
    recoverable: fields.BooleanField<boolean, boolean, false>;
    /**
     * Lost hitpoints should reevaluate on item update, with the parent actor losing the difference in HP between the
     * new and old values.
     */
    reevaluateOnUpdate: fields.BooleanField<boolean, boolean, false>;
};

export { LoseHitPointsRuleElement };
