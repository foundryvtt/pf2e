import { CreaturePF2e } from "@actor";
import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { ItemSourcePF2e } from "@item/data";
import { RuleElementPF2e, RuleElementSource } from "./";
import { RuleElementOptions } from "./base";

/** Reduce current hit points without applying damage */
export class LoseHitPointsRuleElement extends RuleElementPF2e {
    static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    /**
     * Lost hitpoints should reevaluate on item update, with the parent actor losing the difference in HP between the
     * new and old values.
     */
    private reevaluateOnUpdate: boolean;

    constructor(data: LoseHitPointsSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        const valueIsValid = typeof data.value === "number" || typeof data.value === "string";
        if (!valueIsValid) {
            this.failValidation("Missing numeric or string value");
        }
        this.reevaluateOnUpdate = !!data.reevaluateOnUpdate;
    }

    override onCreate(actorUpdates: Record<string, unknown>): void {
        if (this.ignored) return;
        const value = Math.abs(Number(this.resolveValue()) || 0);
        const currentHP = this.actor._source.system.attributes.hp.value;
        actorUpdates["system.attributes.hp.value"] = Math.max(currentHP - value, 0);
    }

    override async preUpdate(changes: DeepPartial<ItemSourcePF2e>): Promise<void> {
        if (!this.reevaluateOnUpdate || this.ignored) return;
        const previousValue = Math.abs(Number(this.resolveValue()) || 0);
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

interface LoseHitPointsSource extends RuleElementSource {
    value?: unknown;
    reevaluateOnUpdate?: unknown;
}

export interface LoseHitPointsRuleElement extends RuleElementPF2e {
    get actor(): CreaturePF2e;
}
