import { CharacterPF2e, NPCPF2e } from "@actor";
import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { RuleElementSource } from "..";
import { RuleElementPF2e, RuleElementData } from "./";
import { RuleElementOptions } from "./base";

/**
 * @category RuleElement
 */
export class TogglePropertyRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    checked: boolean;

    constructor(data: TogglePropertySource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        this.data.default = typeof data.default === "boolean" ? data.default : false;
        this.checked = Boolean(getProperty(this.actor.data, this.data.property) ?? this.data.default);
        setProperty(this.actor.data, this.data.property, this.checked);
    }

    override beforePrepareData(): void {
        const { predicate } = this;
        if (predicate && !predicate.test(this.actor.getRollOptions())) {
            setProperty(this.actor.data, this.data.property, false);
            return;
        }

        if (this.data.property) {
            setProperty(this.actor.data, this.data.property, this.checked);
            this.actor.data.data.toggles.actions.push({
                label: this.label,
                inputName: this.data.property,
                checked: this.checked,
            });
        } else {
            this.failValidation("Toggle flag requires a property field with an object path");
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
