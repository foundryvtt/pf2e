import { CharacterPF2e, NPCPF2e } from "@actor";
import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { PredicatePF2e, RawPredicate } from "@system/predication";
import { RuleElementSource } from "..";
import { RuleElementPF2e, RuleElementData } from "./";
import { RuleElementOptions } from "./base";

/**
 * @category RuleElement
 */
export class TogglePropertyRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc"];

    /** The current value of the toggle */
    value: boolean;

    /** Whether the toggle is interactable by the user. The value may still be true even if the toggle is disabled */
    enabled: PredicatePF2e;

    constructor(data: TogglePropertySource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);

        this.data.default = typeof data.default === "boolean" ? data.default : false;
        this.value = Boolean(getProperty(this.actor.data, this.data.property) ?? this.data.default);
        this.enabled = new PredicatePF2e(this.data.enabled);
        setProperty(this.actor.data, this.data.property, this.value);
    }

    override beforePrepareData(): void {
        const { predicate } = this;
        const rollOptions = this.actor.getRollOptions();
        if (predicate && !predicate.test(rollOptions)) {
            setProperty(this.actor.data, this.data.property, false);
            return;
        }

        if (this.data.property) {
            setProperty(this.actor.data, this.data.property, this.value);
            this.actor.data.data.toggles.actions.push({
                label: this.label,
                inputName: this.data.property,
                checked: this.value,
                enabled: this.enabled.test(rollOptions),
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

interface TogglePropertyData extends RuleElementData {
    property: string;
    enabled?: RawPredicate;
    default: boolean;
}

interface TogglePropertySource extends RuleElementSource {
    property?: unknown;
    enabled?: unknown;
    default?: unknown;
}
