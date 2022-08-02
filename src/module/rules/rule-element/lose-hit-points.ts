import { CreaturePF2e } from "@actor";
import { ItemPF2e } from "@item";
import { ItemSourcePF2e } from "@item/data";
import { RuleElementPF2e, RuleElementSource } from "./";
import { RuleElementOptions } from "./base";

/** Reduce current hit points without applying damage */
export class LoseHitPointsRuleElement extends RuleElementPF2e {
    /** Lost hitpoints should reevaluate on item update, with the parent actor losing the difference in HP between the new and old values */
    protected reevaluateOnUpdate: boolean;

    constructor(data: LoseHitPointsSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);
        const actorIsCreature = this.actor instanceof CreaturePF2e;
        const valueIsValid = typeof data.value === "number" || typeof data.value === "string";
        if (!(actorIsCreature && valueIsValid)) this.ignored = true;
        this.reevaluateOnUpdate = !!data.reevaluateOnUpdate;
    }

    override onCreate(actorUpdates: Record<string, unknown>): void {
        if (this.ignored) return;
        const value = Math.abs(Number(this.resolveValue()) || 0);
        const currentHP = this.actor._source.data.attributes.hp.value;
        actorUpdates["data.attributes.hp.value"] = Math.max(currentHP - value, 0);
    }

    override async preUpdate(changes: DeepPartial<ItemSourcePF2e>): Promise<void> {
        if (!this.reevaluateOnUpdate || this.ignored) return;
        const previousValue = Math.abs(Number(this.resolveValue()) || 0);
        const newItem = this.item.clone(changes);
        const rule = newItem.system.rules.find((r) => r.key === this.key);
        const newValue = Math.abs(Number(this.resolveValue(rule?.value, 0, { resolvables: { item: newItem } })));
        const valueChange = newValue - previousValue;
        if (valueChange > 0) {
            const currentHP = this.actor._source.data.attributes.hp.value;
            await this.actor.update(
                { "data.attributes.hp.value": Math.max(currentHP - valueChange, 0) },
                { render: false }
            );
        }
    }
}

interface LoseHitPointsSource extends RuleElementSource {
    reevaluateOnUpdate?: unknown;
}

export interface LoseHitPointsRuleElement extends RuleElementPF2e {
    get actor(): CreaturePF2e;
}
