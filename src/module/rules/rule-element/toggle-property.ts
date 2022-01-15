import { CharacterPF2e, NPCPF2e } from "@actor";
import { ActorType } from "@actor/data";
import { RuleElementPF2e, RuleElementData } from "./";

/**
 * @category RuleElement
 */
export class TogglePropertyRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    override onBeforePrepareData() {
        if (this.data.property) {
            this.actor.data.data.toggles.actions.push({
                label: this.label,
                inputName: this.data.property,
                checked: getProperty(this.actor.data, this.data.property),
            });
        } else {
            console.warn(
                "PF2E | Toggle flag requires at least a label field or item name, and a property field with the name of the property"
            );
        }
    }
}

export interface TogglePropertyRuleElement {
    get actor(): CharacterPF2e | NPCPF2e;
    data: RuleElementData & {
        property: string;
    };
}
