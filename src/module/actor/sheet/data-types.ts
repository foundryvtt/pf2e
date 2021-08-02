import { ActorPF2e } from "@actor/base";
import { LootPF2e } from "@actor/loot";
import { getContainerMap } from "@item/container/helpers";
import { ArmorData, ConsumableData, EquipmentData, PhysicalItemData, TreasureData, WeaponData } from "@item/data";
import { IdentificationData, MystifiedData } from "@item/physical/data";
import { Coins } from "@item/treasure/helpers";

type ContainerMap = ReturnType<typeof getContainerMap>;
type SheetContainerData = ContainerMap extends Map<string, infer X> ? X : never;
export type InventoryItem<D extends PhysicalItemData = PhysicalItemData> = D & {
    canBeEquipped: boolean;
    containerData: SheetContainerData;
    isContainer: boolean;
    isInContainer: boolean;
    isSellableTreasure?: boolean;
    showEdit: boolean;
    totalWeight: string;
    data: D["data"] & {
        identification: IdentificationData & {
            identified: MystifiedData;
        };
    };
};

interface CoinDisplayData {
    value: number;
    label: string;
}

export type CoinageSummary = Record<keyof Coins, CoinDisplayData>;

interface SheetItemList<D extends PhysicalItemData> {
    label: string;
    type: D["type"];
    items: InventoryItem<D>[];
}

export interface SheetInventory {
    weapon: SheetItemList<WeaponData>;
    armor: SheetItemList<ArmorData>;
    equipment: SheetItemList<EquipmentData>;
    consumable: SheetItemList<ConsumableData>;
    treasure: SheetItemList<TreasureData>;
}

export interface ActorSheetDataPF2e<TActor extends ActorPF2e> extends ActorSheetData<TActor> {
    isTargetFlatFooted: boolean;
    isProficiencyLocked: boolean;
    user: { isGM: boolean };
    totalCoinage: CoinageSummary;
    totalCoinageGold: string;
    totalWealth: Coins;
    totalWealthGold: string;
}

export interface LootSheetDataPF2e extends ActorSheetDataPF2e<LootPF2e> {
    isLoot: boolean;
}
