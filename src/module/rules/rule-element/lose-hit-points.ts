import { CreaturePF2e } from "@actor";
import { ItemPF2e } from "@item";
import { RuleElementPF2e, RuleElementSource } from "./";
import { RuleElementOptions } from "./base";

/** Reduce current hit points without applying damage */
export class LoseHitPointsRuleElement extends RuleElementPF2e {
    constructor(data: RuleElementSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);
        const actorIsCreature = this.actor instanceof CreaturePF2e;
        const valueIsValid = typeof data.value === "number" || typeof data.value === "string";
        if (!(actorIsCreature && valueIsValid)) this.ignored = true;
    }

    override onCreate(actorUpdates: Record<string, unknown>): void {
        if (this.ignored) return;
        const value = Math.abs(Number(this.resolveValue()) || 0);
        if (typeof value === "number") {
            const currentHP = this.actor.data._source.data.attributes.hp.value;
            actorUpdates["data.attributes.hp.value"] = Math.max(currentHP - value, 0);
        }
    }
}

export interface LoseHitPointsRuleElement extends RuleElementPF2e {
    get actor(): CreaturePF2e;
}
