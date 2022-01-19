import { ItemPF2e } from "@item";
import { TriggerListenerData, TriggerListenerRuleElement, TriggerListenerSource } from "./base";

/**
 * Trigger Listener rule element that, when triggered, will update a property
 */
class TriggerListenerTogglePropertyRuleElement extends TriggerListenerRuleElement {
    constructor(data: TriggerListenerTogglePropertySource, item: Embedded<ItemPF2e>) {
        super(data, item);
    }

    override async trigger() {
        const currentValue = this.actor.getFlag("pf2e", this.data.property);
        if (typeof currentValue === "boolean") {
            this.actor.setFlag(
                this.data.propertyScope ?? "pf2e",
                this.data.property,
                this.data.updateType === "enable" || (this.data.updateType === "toggle" && !currentValue)
            );
        }
    }
}

interface TriggerListenerTogglePropertyRuleElement {
    data: TriggerListenerTogglePropertyData;
}

interface TriggerListenerTogglePropertySource extends TriggerListenerSource {
    propertyScope?: unknown;
    property?: unknown;
    updateType?: unknown;
}

interface TriggerListenerTogglePropertyData extends TriggerListenerData {
    propertyScope?: string;
    property: string;
    updateType: "enable" | "disable" | "toggle";
}

export { TriggerListenerTogglePropertyRuleElement };
