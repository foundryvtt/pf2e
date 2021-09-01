import { RuleElementPF2e } from "../rule-element";

/**
 * @category RuleElement
 */
export class TempHPRuleElement extends RuleElementPF2e {
    override onCreate(actorUpdates: Record<string, unknown>) {
        const updatedActorData = mergeObject(this.actor.data, actorUpdates, { inplace: false });
        const value = this.resolveValue(this.data.value);

        if (typeof value !== "number") {
            console.warn("PF2E | Temporary HP requires a non-zero value field or a formula field");
            return;
        }

        const currentTempHP = Number(getProperty(updatedActorData, "data.attributes.hp.temp")) || 0;
        if (value > currentTempHP) {
            mergeObject(actorUpdates, {
                "data.attributes.hp.temp": value,
                "data.attributes.hp.tempsource": this.item.id,
            });
        }
    }

    override onDelete(actorUpdates: Record<string, unknown>) {
        const updatedActorData = mergeObject(this.actor.data, actorUpdates, { inplace: false });
        if (getProperty(updatedActorData, "data.attributes.hp.tempsource") === this.item.id) {
            mergeObject(actorUpdates, {
                "data.attributes.hp.temp": 0,
            });
            getProperty(actorUpdates, "data.attributes.hp")["-=tempsource"] = null;
        }
    }
}
