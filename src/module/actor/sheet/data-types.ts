import { ActorPF2e } from "@actor/base";
import { ActorSizePF2e } from "@actor/data/size";
import { InventoryBulk } from "@actor/inventory";
import { LootPF2e } from "@actor/loot";
import { PhysicalItemPF2e } from "@item";
import { Coins } from "@item/physical/data";
import { PhysicalItemType } from "@item/physical/types";
import { SheetOptions } from "@module/sheet/helpers";

export interface InventoryItem<TItem extends PhysicalItemPF2e = PhysicalItemPF2e> {
    item: TItem;
    /** Item size if it causes any weight difference relative to the actor */
    itemSize?: ActorSizePF2e | null;
    editable: boolean;
    isContainer: boolean;
    canBeEquipped: boolean;
    isInvestable: boolean;
    isSellable: boolean;
    hasCharges: boolean;
    heldItems?: InventoryItem[];
}

interface CoinDisplayData {
    value: number;
    label: string;
}

export type CoinageSummary = { [K in keyof Coins]?: CoinDisplayData };

interface SheetItemList {
    label: string;
    type: PhysicalItemType;
    items: InventoryItem[];
}

export interface SheetInventory {
    sections: Record<Exclude<PhysicalItemType, "book">, SheetItemList>;
    bulk: InventoryBulk;
    showValueAlways: boolean;
    showIndividualPricing: boolean;
    invested?: { value: number; max: number } | null;
}

export interface ActorSheetDataPF2e<TActor extends ActorPF2e> extends ActorSheetData<TActor> {
    traits: SheetOptions;
    isTargetFlatFooted: boolean;
    user: { isGM: boolean };
    totalCoinage: CoinageSummary;
    totalCoinageGold: string;
    totalWealth: Coins;
    totalWealthGold: string;
    inventory: SheetInventory;
    enrichedContent: Record<string, string>;
}

export interface LootSheetDataPF2e extends ActorSheetDataPF2e<LootPF2e> {
    isLoot: boolean;
}
