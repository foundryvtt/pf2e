import { CreaturePF2e } from "@actor";
import { ActorType } from "@actor/data";
import { ActorSizePF2e } from "@actor/data/size";
import { ItemPF2e, TreasurePF2e } from "@item";
import { Size, SIZES } from "@module/data";
import { tupleHasValue } from "@util";
import { RuleElementPF2e, RuleElementData, RuleElementSource, RuleElementOptions } from "./";

/**
 * @category RuleElement
 * Increase the creature's size
 */
export class CreatureSizeRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc", "familiar"];

    resizeEquipment: boolean;

    constructor(data: CreatureSizeConstructionData, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);
        this.resizeEquipment = !!data.resizeEquipment;
    }

    private static wordToAbbreviation: Record<string, Size | undefined> = {
        tiny: "tiny",
        small: "sm",
        medium: "med",
        large: "lg",
        huge: "huge",
        gargantuan: "grg",
    };

    private static incrementMap = { tiny: "sm", sm: "med", med: "lg", lg: "huge", huge: "grg", grg: "grg" } as const;

    private static decrementMap = { tiny: "tiny", sm: "tiny", med: "sm", lg: "med", huge: "lg", grg: "huge" } as const;

    private incrementSize(size: Size, amount: number): Size {
        if (amount === 0) return size;
        return this.incrementSize(CreatureSizeRuleElement.incrementMap[size], amount - 1);
    }

    private decrementSize(size: Size, amount: number): Size {
        if (amount === 0) return size;
        return this.decrementSize(CreatureSizeRuleElement.decrementMap[size], amount - 1);
    }

    override beforePrepareData(): void {
        if (!this.test()) return;

        const value = this.resolveValue();
        if (!(typeof value === "string" || typeof value === "number")) {
            this.failValidation(
                `CreatureSize Rule Element on actor ${this.actor.id} (${this.actor.name})`,
                "has a non-string, non-numeric value"
            );
            return;
        }
        const size = CreatureSizeRuleElement.wordToAbbreviation[value] ?? value;
        if (typeof size === "string" && !tupleHasValue(SIZES, size)) {
            this.failValidation(`"${size}" is not a recognized size`);
            return;
        }
        const originalSize = new ActorSizePF2e({ value: this.actor.size });

        if (value === 1) {
            if (this.data.maximumSize && !originalSize.isSmallerThan(this.data.maximumSize)) {
                return;
            }
            this.actor.system.traits.size.increment();
        } else if (value === -1) {
            if (this.data.minimumSize && !originalSize.isLargerThan(this.data.minimumSize)) {
                return;
            }
            this.actor.system.traits.size.decrement();
        } else if (tupleHasValue(SIZES, size)) {
            this.actor.system.traits.size = new ActorSizePF2e({ value: size });
        } else {
            const validValues = Array.from(
                new Set(Object.entries(CreatureSizeRuleElement.wordToAbbreviation).flat())
            ).join('", "');
            this.failValidation(
                `CreatureSize Rule Element on actor ${this.actor.id} (${this.actor.name})`,
                `has an invalid value: must be one of "${validValues}", +1, or -1`
            );
            return;
        }

        if (this.resizeEquipment) {
            const sizeDifference = originalSize.difference(this.actor.system.traits.size);
            for (const item of this.actor.inventory.filter((i) => !(i instanceof TreasurePF2e && i.isCoinage))) {
                if (sizeDifference < 0) {
                    item.system.size = this.incrementSize(item.size, Math.abs(sizeDifference));
                } else if (sizeDifference > 0) {
                    item.system.size = this.decrementSize(item.size, Math.abs(sizeDifference));
                }
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
