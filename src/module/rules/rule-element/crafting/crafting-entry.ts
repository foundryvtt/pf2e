import { RuleElementPF2e, RuleElementData, RuleElementSource } from "../";
import { CharacterPF2e } from "@actor";
import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { PhysicalItemTrait } from "@item/physical/data";
import { CraftingEntryData } from "@module/crafting/crafting-entry";

/**
 * @category RuleElement
 */
class CraftingEntryRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character"];

    constructor(data: CraftingEntryRuleSource, item: Embedded<ItemPF2e>) {
        if (!data.selector) {
            console.warn("PF2E | Crafting entry rule element requires a a non-empty selector field");
            data.ignored = true;
        }

        if (!data.name) {
            console.warn("PF2E | Crafting entry rule element requires a a non-empty name field");
            data.ignored = true;
        }

        super(data, item);
    }

    override onCreate(actorUpdates: Record<string, unknown>): void {
        const selector = String(this.resolveValue(this.data.selector));

        const data: CraftingEntryData = {
            actorPreparedFormulas: [],
            selector: selector,
            name: this.data.name,
            isAlchemical: this.data.isAlchemical,
            isDailyPrep: this.data.isDailyPrep,
            isPrepared: this.data.isPrepared,
            requiredTraits: this.data.requiredTraits,
            maxItemLevel: this.data.maxItemLevel,
            maxSlots: this.data.maxSlots,
        };

        mergeObject(actorUpdates, {
            [`data.crafting.entries.${selector}`]: data,
        });
    }

    override onDelete(actorUpdates: Record<string, unknown>): void {
        const selector = this.resolveValue(this.data.selector);
        actorUpdates[`data.crafting.entries.-=${selector}`] = null;
    }
}

interface CraftingEntryRuleElement extends RuleElementPF2e {
    data: CraftingEntryRuleData;

    get actor(): CharacterPF2e;
}

interface CraftingEntryRuleData extends RuleElementData {
    name: string;
    isAlchemical?: boolean;
    isDailyPrep?: boolean;
    isPrepared?: boolean;
    requiredTraits?: PhysicalItemTrait[][];
    maxItemLevel?: number;
    maxSlots?: number;
}

interface CraftingEntryRuleSource extends RuleElementSource {
    name?: string;
    isAlchemical?: boolean;
    isDailyPrep?: boolean;
    isPrepared?: boolean;
    requiredTraits?: PhysicalItemTrait[][];
    maxItemLevel?: number;
    maxSlots?: number;
}

export { CraftingEntryRuleElement };
