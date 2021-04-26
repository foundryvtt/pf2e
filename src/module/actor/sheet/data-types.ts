import {
    ArmorData,
    ConsumableData,
    EquipmentData,
    PhysicalItemData,
    TreasureData,
    WeaponData,
} from '@item/data-definitions';

interface SheetItemList<D extends PhysicalItemData> {
    label: string;
    type: D['type'];
    items: D[];
}

export interface SheetInventory {
    weapon: SheetItemList<WeaponData>;
    armor: SheetItemList<ArmorData>;
    equipment: SheetItemList<EquipmentData>;
    consumable: SheetItemList<ConsumableData>;
    treasure: SheetItemList<TreasureData>;
}
