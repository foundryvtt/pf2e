import { CharacterData, NPCData } from "@actor/data";
import { RuleElementPF2e } from "../rule-element";
import { RuleElementData } from "../rules-data-definitions";

/**
 * @category RuleElement
 */
export class PF2TogglePropertyRuleElement extends RuleElementPF2e {
    override onBeforePrepareData(actorData: CharacterData | NPCData) {
        if (this.data.property) {
            (actorData.data as any).toggles.actions.push({
                label: this.label,
                inputName: this.data.property,
                checked: getProperty(actorData, this.data.property),
            });
        } else {
            console.warn(
                "PF2E | Toggle flag requires at least a label field or item name, and a property field with the name of the property"
            );
        }
    }
}

export interface PF2TogglePropertyRuleElement {
    data: RuleElementData & {
        property: string;
    };
}
