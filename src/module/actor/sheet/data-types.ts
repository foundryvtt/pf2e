import {
    ArmorData,
    ConsumableData,
    EquipmentData,
    IdentificationData,
    MystifiedData,
    PhysicalItemData,
    TreasureData,
    WeaponData,
} from '@item/data/types';
import { getContainerMap } from '@item/container';
import { Coins } from '@item/treasure';
import { ActorPF2e } from '@actor/base';

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
    data: D['data'] & {
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
    type: D['type'];
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
