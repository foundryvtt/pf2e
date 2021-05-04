import { ActorDataPF2e } from '@actor/data-definitions';
import {
    ArmorData,
    ConsumableData,
    EquipmentData,
    IdentificationData,
    MeleeData,
    MystifiedData,
    PhysicalItemData,
    TreasureData,
    WeaponData,
} from '@item/data/types';
import { getContainerMap } from '@item/container';
import { Coins } from '@item/treasure';

type ContainerMap = ReturnType<typeof getContainerMap>;
type SheetContainerData = ContainerMap extends Map<string, infer X> ? X : never;
type PhysicalItemSubset = Exclude<PhysicalItemData, MeleeData>;
export type InventoryItem<D extends PhysicalItemSubset = PhysicalItemSubset> = D & {
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

interface SheetItemList<D extends PhysicalItemSubset> {
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

export interface ActorSheetDataPF2e<DataType extends ActorDataPF2e = ActorDataPF2e> extends ActorSheetData<DataType> {
    isTargetFlatFooted: boolean;
    isProficiencyLocked: boolean;
    user: { isGM: boolean };
    totalCoinage: CoinageSummary;
    totalCoinageGold: string;
    totalWealth: Coins;
    totalWealthGold: string;
}
