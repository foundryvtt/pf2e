import { CreaturePF2e } from "@actor";
import { ActorType } from "@actor/data";
import { ActorSizePF2e } from "@actor/data/size";
import { ItemPF2e } from "@item";
import { Size, SIZES } from "@module/data";
import { tupleHasValue } from "@util";
import { RuleElementPF2e, RuleElementData, RuleElementSource } from "./";

/**
 * @category RuleElement
 * Increase the creature's size
 */
export class CreatureSizeRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc", "familiar"];

    constructor(data: CreatureSizeConstructionData, item: Embedded<ItemPF2e>) {
        data.resizeEquipment ??= false;
        super(data, item);
    }

    private static wordToAbbreviation: Record<string, Size | undefined> = {
        tiny: "tiny",
        small: "sm",
        medium: "med",
        large: "lg",
        huge: "huge",
        gargantuan: "grg",
    };

    private incrementSize(size: Size): Size {
        switch (size) {
            case "tiny":
                return "sm";
            case "sm":
                return "med";
            case "lg":
                return "huge";
            default:
                return "grg";
        }
    }

    override onBeforePrepareData() {
        if (this.ignored) return;

        const value = this.resolveValue();
        if (!(typeof value === "string" || typeof value === "number")) {
            console.warn(
                `PF2E System | CreatureSize Rule Element on actor ${this.actor.id} (${this.actor.name})`,
                "has a non-string, non-numeric value"
            );
            return;
        }
        const size = CreatureSizeRuleElement.wordToAbbreviation[value] ?? value;

        if (value === 1) {
            if (this.data.maximumSize && !this.actor.data.data.traits.size.isSmallerThan(this.data.maximumSize)) {
                return;
            }
            this.actor.data.data.traits.size.increment();
        } else if (value === -1) {
            if (this.data.minimumSize && !this.actor.data.data.traits.size.isLargerThan(this.data.minimumSize)) {
                return;
            }
            this.actor.data.data.traits.size.decrement();
        } else if (tupleHasValue(SIZES, size)) {
            this.actor.data.data.traits.size = new ActorSizePF2e({ value: size });
        } else {
            const validValues = Array.from(
                new Set(Object.entries(CreatureSizeRuleElement.wordToAbbreviation).flat())
            ).join('", "');
            console.warn(
                `PF2E System | CreatureSize Rule Element on actor ${this.actor.id} (${this.actor.name})`,
                `has an invalid value: must be one of "${validValues}", +1, or -1`
            );
            return;
        }

        if (this.data.resizeEquipment) {
            for (const item of this.actor.physicalItems) {
                item.data.data.size.value = this.incrementSize(item.size);
            }
        }
    }
}

export interface CreatureSizeRuleElement extends RuleElementPF2e {
    get actor(): CreaturePF2e;

    data: CreatureSizeRuleElementData;
}

interface CreatureSizeRuleElementData extends RuleElementData {
    resizeEquipment: boolean;
    minimumSize?: ActorSizePF2e;
    maximumSize?: ActorSizePF2e;
}

interface CreatureSizeConstructionData extends RuleElementSource {
    resizeEquipment?: boolean;
}
