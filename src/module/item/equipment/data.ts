import {
    BasePhysicalItemData,
    BasePhysicalItemSource,
    Investable,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data";
import type { EquipmentPF2e } from ".";

type EquipmentSource = BasePhysicalItemSource<"equipment", EquipmentSystemSource>;

type EquipmentData = Omit<EquipmentSource, "data" | "effects" | "flags"> &
    BasePhysicalItemData<EquipmentPF2e, "equipment", EquipmentSystemData, EquipmentSource>;

type EquipmentTrait = keyof ConfigPF2e["PF2E"]["equipmentTraits"];
type EquipmentTraits = PhysicalItemTraits<EquipmentTrait>;

interface EquipmentSystemSource extends Investable<PhysicalSystemSource> {
    traits: EquipmentTraits;
}

type EquipmentSystemData = Omit<EquipmentSystemSource, "price"> & PhysicalSystemData;

export { EquipmentData, EquipmentSource, EquipmentTrait, EquipmentTraits, EquipmentSystemData, EquipmentSystemSource };
