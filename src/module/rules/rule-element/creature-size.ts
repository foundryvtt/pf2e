import { CreaturePF2e } from "@actor";
import { ActorType } from "@actor/data";
import { ActorSizePF2e } from "@actor/data/size";
import { ItemPF2e, TreasurePF2e } from "@item";
import { Size, SIZES } from "@module/data";
import { isObject, tupleHasValue } from "@util";
import { RuleElementPF2e, RuleElementData, RuleElementSource, RuleElementOptions, BracketedValue } from "./";

/**
 * @category RuleElement
 * Change a creature's size
 */
class CreatureSizeRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "npc", "familiar"];

    value: string | number | BracketedValue;

    /** An optional reach adjustment to accompany the size */
    reach: ReachObject | null = null;

    resizeEquipment: boolean;

    constructor(data: CreatureSizeSource, item: Embedded<ItemPF2e>, options?: RuleElementOptions) {
        super(data, item, options);
        this.resizeEquipment = !!data.resizeEquipment;

        if (typeof data.value === "string" || typeof data.value === "number" || this.isBracketedValue(data.value)) {
            this.value = data.value;
        } else {
            this.value = item.actor.size;
            this.failValidation("`value` must be a string or number");
        }

        if (this.#isReachValue(data.reach)) {
            this.reach = data.reach;
        } else if ("reach" in data) {
            this.failValidation("`reach` must be a number");
        }
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

    #isReachValue(value: unknown): value is ReachObject {
        return (
            isObject<string>(value) &&
            Object.keys(value).length === 1 &&
            ["add", "upgrade", "override"].some(
                (k) => ["number", "string"].includes(typeof value[k]) || this.isBracketedValue(value[k])
            )
        );
    }

    override beforePrepareData(): void {
        if (!this.test()) return;

        const value = this.resolveValue(this.value);
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
        const { actor } = this;
        const originalSize = new ActorSizePF2e({ value: actor.size });

        if (value === 1) {
            if (this.data.maximumSize && !originalSize.isSmallerThan(this.data.maximumSize)) {
                return;
            }
            actor.system.traits.size.increment();
        } else if (value === -1) {
            if (this.data.minimumSize && !originalSize.isLargerThan(this.data.minimumSize)) {
                return;
            }
            actor.system.traits.size.decrement();
        } else if (tupleHasValue(SIZES, size)) {
            actor.system.traits.size = new ActorSizePF2e({ value: size });
        } else {
            const validValues = Array.from(
                new Set(Object.entries(CreatureSizeRuleElement.wordToAbbreviation).flat())
            ).join('", "');
            this.failValidation(
                `CreatureSize Rule Element on actor ${actor.id} (${actor.name})`,
                `has an invalid value: must be one of "${validValues}", +1, or -1`
            );
            return;
        }

        actor.attributes.reach.base = this.#getReach();

        if (this.resizeEquipment) {
            const sizeDifference = originalSize.difference(actor.system.traits.size);
            for (const item of actor.inventory.filter((i) => !(i instanceof TreasurePF2e && i.isCoinage))) {
                if (sizeDifference < 0) {
                    item.system.size = this.incrementSize(item.size, Math.abs(sizeDifference));
                } else if (sizeDifference > 0) {
                    item.system.size = this.decrementSize(item.size, Math.abs(sizeDifference));
                }
            }
        }
    }

    /** Return a new reach distance if one is specified */
    #getReach(): number {
        const current = this.actor.attributes.reach.base;
        if (this.reach === null) return current;

        const reachChange: { [K in "add" | "upgrade" | "override"]?: ReachValue } = this.reach;
        const changeValue = ((): number => {
            const resolved = this.resolveValue(reachChange.add ?? reachChange.upgrade ?? reachChange.override);
            return Math.trunc(Math.abs(Number(resolved)));
        })();

        if (!Number.isInteger(changeValue)) return current;
        if (reachChange.add) return current + changeValue;
        if ("upgrade" in reachChange) return Math.max(current, changeValue);
        if ("override" in reachChange) return changeValue;

        return current;
    }
}

type ReachObject = { add: ReachValue } | { upgrade: ReachValue } | { override: ReachValue };
type ReachValue = string | number | BracketedValue;

interface CreatureSizeRuleElement extends RuleElementPF2e {
    get actor(): CreaturePF2e;

    data: CreatureSizeRuleElementData;
}

interface CreatureSizeRuleElementData extends RuleElementData {
    resizeEquipment: boolean;
    minimumSize?: ActorSizePF2e;
    maximumSize?: ActorSizePF2e;
}

interface CreatureSizeSource extends RuleElementSource {
    reach?: unknown;
    resizeEquipment?: unknown;
}

export { CreatureSizeRuleElement };
