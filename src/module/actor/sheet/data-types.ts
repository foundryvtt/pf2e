import { ActorPF2e } from "@actor/base.ts";
import { ActorSizePF2e } from "@actor/data/size.ts";
import { InventoryBulk } from "@actor/inventory/index.ts";
import { PhysicalItemPF2e } from "@item";
import { Coins } from "@item/physical/data.ts";
import { PhysicalItemType } from "@item/physical/types.ts";
import { RollOptionToggle } from "@module/rules/synthetics.ts";
import { SheetOptions } from "@module/sheet/helpers.ts";

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
    hasStowingContainers: boolean;
    invested?: { value: number; max: number } | null;
}

export interface ActorSheetDataPF2e<TActor extends ActorPF2e> extends ActorSheetData<TActor> {
    traits: SheetOptions;
    isTargetFlatFooted: boolean;
    user: { isGM: boolean };
    toggles: RollOptionToggle[];
    totalCoinage: CoinageSummary;
    totalCoinageGold: string;
    totalWealth: Coins;
    totalWealthGold: string;
    inventory: SheetInventory;
    enrichedContent: Record<string, string>;
}

export interface ActorSheetRenderOptionsPF2e extends RenderOptions {
    /** What tab to switch to when rendering the sheet */
    tab?: string;
}
