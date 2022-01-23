import { ItemPF2e } from "@item";
import { RuleElementData, RuleElementPF2e, RuleElementSource } from "../..";

/**
 * Abstract rule element for trigger listeners
 */
abstract class TriggerListenerRuleElement extends RuleElementPF2e {
    constructor(data: TriggerListenerSource, item: Embedded<ItemPF2e>) {
        super(data, item);
    }

    abstract trigger(): void;
}

interface TriggerListenerRuleElement {
    data: TriggerListenerData;
}

export interface TriggerListenerSource extends RuleElementSource {
    triggerNames?: unknown;
}

export interface TriggerListenerData extends RuleElementData {
    triggerNames: string[];
}

export { TriggerListenerRuleElement };
