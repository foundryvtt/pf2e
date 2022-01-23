import { ItemPF2e } from "@item";
import { ItemSourcePF2e } from "@item/data";
import { TriggerListenerData, TriggerListenerRuleElement, TriggerListenerSource } from "./base";

/**
 * Trigger Listener rule element that, when triggered, will add an effect item to the parent actor
 */
class TriggerListenerEffectRuleElement extends TriggerListenerRuleElement {
    constructor(data: TriggerListenerEffectSource, item: Embedded<ItemPF2e>) {
        super(data, item);
    }

    override async trigger() {
        const item: ItemPF2e | null = await fromUuid(this.data.itemId);
        if (!item) {
            return;
        }

        const source: PreCreate<ItemSourcePF2e> = item.toObject();
        source._id = randomID();

        this.actor.createEmbeddedDocuments("Item", [source]);
    }
}

interface TriggerListenerEffectRuleElement {
    data: TriggerListenerEffectData;
}

interface TriggerListenerEffectSource extends TriggerListenerSource {
    itemId?: unknown;
}

interface TriggerListenerEffectData extends TriggerListenerData {
    itemId: string;
}

export { TriggerListenerEffectRuleElement };
