import { ActorPF2e } from "@actor/base";
import { InventoryBulk } from "@actor/inventory";
import { LootPF2e } from "@actor/loot";
import { PhysicalItemPF2e } from "@item";
import { Coins } from "@item/physical/data";
import { PhysicalItemType } from "@item/physical/types";
import { SheetOptions } from "@module/sheet/helpers";

export interface InventoryItem<D extends PhysicalItemPF2e = PhysicalItemPF2e> {
    item: D;
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
    invested?: { value: number; max: number } | null;
    overInvested?: boolean;
}

export interface SheetInventory {
    sections: Record<Exclude<PhysicalItemType, "book">, SheetItemList>;
    bulk: InventoryBulk;
}

export interface ActorSheetDataPF2e<TActor extends ActorPF2e> extends ActorSheetData<TActor> {
    traits: SheetOptions;
    isTargetFlatFooted: boolean;
    user: { isGM: boolean };
    totalCoinage: CoinageSummary;
    totalCoinageGold: string;
    totalWealth: Coins;
    totalWealthGold: string;
    immunities: SheetOptions;
    hasImmunities: boolean;
    inventory: SheetInventory;
}

export interface LootSheetDataPF2e extends ActorSheetDataPF2e<LootPF2e> {
    isLoot: boolean;
}
