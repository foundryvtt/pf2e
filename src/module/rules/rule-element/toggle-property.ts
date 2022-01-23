import { CharacterPF2e, NPCPF2e } from "@actor";
import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { RuleElementSource } from "..";
import { RuleElementPF2e, RuleElementData } from "./";

/**
 * @category RuleElement
 */
export class TogglePropertyRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    checked: boolean;

    constructor(data: TogglePropertySource, item: Embedded<ItemPF2e>) {
        super(data, item);

        this.data.default = typeof data.default === "boolean" ? data.default : false;
        this.checked = Boolean(getProperty(this.actor.data, this.data.property) ?? this.data.default);
        setProperty(this.actor.data, this.data.property, this.checked);
    }

    override beforePrepareData(): void {
        if (this.data.property) {
            this.actor.data.data.toggles.actions.push({
                label: this.label,
                inputName: this.data.property,
                checked: this.checked,
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
    data: TogglePropertyData;
}

interface TogglePropertySource extends RuleElementSource {
    property?: unknown;
    default?: unknown;
}

interface TogglePropertyData extends RuleElementData {
    property: string;
    default: boolean;
}
