import { ItemPF2e } from "@item";
import { RuleElementData, RuleElementPF2e, RuleElementSource } from "../..";
import { TriggerListenerRuleElement } from "./listener/base";

/**
 * Rule element that specifies a trigger and then calls "listeners" when that trigger occurs
 */
class TriggerActionRuleElement extends RuleElementPF2e {
    listeners: TriggerListenerRuleElement[] = [];

    constructor(data: TriggerActionSource, item: Embedded<ItemPF2e>) {
        super(data, item);
    }

    /**
     * Look through this actor's items and find any listener rule elements that
     * have the same triggerName as this rule
     */
    override onBeforePrepareData(): void {
        this.listeners = Array.from(this.item.parent.items).flatMap((embedded) =>
            embedded.rules
                .filter((rule) => rule instanceof TriggerListenerRuleElement)
                .map((rule) => rule as TriggerListenerRuleElement)
                .filter((rule) => rule.data.triggerNames.includes(this.data.triggerName))
        );
    }

    /**
     * Triggered when posting the parent item to chat
     */
    override onPost() {
        super.onPost?.();
        this.sendTrigger("onPost");
    }

    async sendTrigger(action: ActionTrigger) {
        if (this.data.triggers.includes(action)) {
            this.listeners.forEach((listener) => listener.trigger({}));
        }
    }
}

interface TriggerActionRuleElement {
    data: TriggerActionData;
}

interface TriggerActionSource extends RuleElementSource {
    triggerName?: unknown;
    trigger?: unknown;
}

/**
 * Possible values for trigger events. Can be expanded to allow new triggers
 */
type ActionTrigger = "onPost";

interface TriggerActionData extends RuleElementData {
    /**
     * The identifier to match with trigger listeners
     */
    triggerName: string;

    /**
     * When the trigger occurs. This can be expanded to allow more trigger timings
     * - onPost: When the item is posted to chat
     */
    triggers: ActionTrigger[];
}

export { TriggerActionRuleElement };
