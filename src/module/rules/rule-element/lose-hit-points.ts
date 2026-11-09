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
        if (this.ignored || !this.test()) return;
        const value = Math.trunc(Math.abs(Number(this.resolveValue(this.value)) || 0));
        const currentHP = this.actor._source.system.attributes.hp.value;
        actorUpdates["system.attributes.hp.value"] = Math.max(currentHP - value, 0);
    }

    override beforePrepareData(): void {
        if (this.ignored || !this.test()) return;

        const { actor } = this;
        if (!this.recoverable) {
            const value = Math.trunc(Math.abs(Number(this.resolveValue(this.value)) || 0));
            actor.system.attributes.hp.unrecoverable += value;
        }
    }

    /**
     * If the lost hitpoints are unrecoverable and this rules element was disabled by its
     * predicate but then becomes reenabled, the actor's current hp might be greater than
     * its effective max hp.  The max hp isn't available during the earlier stages, so
     * here we check for this and set the hp to the effective max if it is over.
     */
    override afterPrepareData(): void {
        if (this.ignored || !this.test()) return;

        const { actor } = this;
        if (!this.recoverable) {
            const maxHP = actor.hitPoints.max;
            const unrecoverableHP = actor.system.attributes.hp.unrecoverable;
            const effectiveMaxHP = maxHP - unrecoverableHP;
            const currentHP = actor.system.attributes.hp.value;
            if (currentHP > effectiveMaxHP) {
                this.actor.update(
                    { "system.attributes.hp.value": effectiveMaxHP },
                    /* We want the change to be visible on the character sheet right away
                       so the HP doesn't jump unexpectedly at some later point.
                    */
                    { render: true },
                );
            }
        }
    }

    override async preUpdate(changes: DeepPartial<ItemSourcePF2e>): Promise<void> {
        if (!this.reevaluateOnUpdate || this.ignored || !this.test()) return;
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
    extends RuleElement<LoseHitPointsRuleSchema>, ModelPropsFromRESchema<LoseHitPointsRuleSchema> {
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
