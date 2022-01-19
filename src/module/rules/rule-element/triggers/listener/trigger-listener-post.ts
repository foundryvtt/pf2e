import { TriggerListenerRuleElement } from "./base";

/**
 * Trigger Listener rule element that, when triggered, will post the rule's item to chat
 */
class TriggerListenerPostItemRuleElement extends TriggerListenerRuleElement {
    override async trigger() {
        this.item.toMessage();
    }

}

export { TriggerListenerPostItemRuleElement }