import { ActorDataPF2e } from '@actor/data-definitions';
import {
    ArmorData,
    ConsumableData,
    EquipmentData,
    KitData,
    MeleeData,
    PhysicalItemData,
    TreasureData,
    WeaponData,
} from '@item/data-definitions';
import { getContainerMap } from '@item/container';

type ContainerMap = ReturnType<typeof getContainerMap>;
type SheetContainerData = ContainerMap extends Map<string, infer X> ? X : never;
type PhysicalItemSubset = Exclude<PhysicalItemData, MeleeData | KitData>;
export type InventoryItem<D extends PhysicalItemSubset = PhysicalItemSubset> = D & {
    canBeEquipped: boolean;
    containerData: SheetContainerData;
    isEquipped: boolean;
    isIdentified: boolean;
    isContainer: boolean;
    isInContainer: boolean;
    isSellableTreasure?: boolean;
    showEdit: boolean;
    totalWeight: string;
};

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
}
