import { ActorPF2e } from "@actor/base.ts";
import { ActorSizePF2e } from "@actor/data/size.ts";
import { InventoryBulk } from "@actor/inventory/index.ts";
import { PhysicalItemPF2e } from "@item";
import { Coins } from "@item/physical/data.ts";
import { RollOptionToggle } from "@module/rules/synthetics.ts";
import { SheetOptions } from "@module/sheet/helpers.ts";

export interface InventoryItem<TItem extends PhysicalItemPF2e = PhysicalItemPF2e> {
    item: TItem;
    /** Item size if it causes any weight difference relative to the actor */
    itemSize?: ActorSizePF2e | null;
    editable: boolean;
    isContainer: boolean;
    canBeEquipped: boolean;
    /** Bulk for each item is shown on an individual basis from merchant sheets */
    unitBulk: string | null;
    isInvestable: boolean;
    isSellable: boolean;
    hasCharges: boolean;
    heldItems?: InventoryItem[];
    notifyInvestment?: boolean;
}

interface CoinDisplayData {
    value: number;
    label: string;
}

export type CoinageSummary = { [K in keyof Coins]?: CoinDisplayData };

interface SheetItemList {
    label: string;
    types: string[];
    items: InventoryItem[];
}

export interface SheetInventory {
    sections: SheetItemList[];
    bulk: InventoryBulk;
    showValueAlways: boolean;
    showUnitBulkPrice: boolean;
    hasStowingContainers: boolean;
    invested?: { value: number; max: number } | null;
}

export interface ActorSheetDataPF2e<TActor extends ActorPF2e> extends ActorSheetData<TActor> {
    data: TActor["system"];
    canDistributeCoins?: { enabled: boolean } | null;
    enrichedContent: Record<string, string>;
    inventory: SheetInventory;
    isLootSheet: boolean;
    isTargetFlatFooted: boolean;
    toggles: Record<string, RollOptionToggle[]>;
    totalCoinage: CoinageSummary;
    totalCoinageGold: string;
    totalWealth: Coins;
    totalWealthGold: string;
    traits: SheetOptions;
    user: { isGM: boolean };
}

export interface ActorSheetRenderOptionsPF2e extends RenderOptions {
    /** What tab to switch to when rendering the sheet */
    tab?: string;
}
