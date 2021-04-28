import { ActorDataPF2e } from '@actor/data-definitions';
import {
    ArmorData,
    ConsumableData,
    EquipmentData,
    PhysicalItemData,
    TreasureData,
    WeaponData,
} from '@item/data-definitions';

export type InventoryItem<D extends PhysicalItemData = PhysicalItemData> = D & {
    isEquipped: boolean;
    isIdentified: boolean;
    isContainer: boolean;
};

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

export interface ActorSheetDataPF2e<DataType extends ActorDataPF2e = ActorDataPF2e> extends ActorSheetData<DataType> {
    isTargetFlatFooted: boolean;
    isProficiencyLocked: boolean;
}
