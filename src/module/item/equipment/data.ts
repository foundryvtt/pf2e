import {
    BasePhysicalItemData,
    BasePhysicalItemSource,
    Investable,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data";
import type { EquipmentPF2e } from ".";

export type EquipmentSource = BasePhysicalItemSource<"equipment", EquipmentSystemSource>;

export class EquipmentData extends BasePhysicalItemData<EquipmentPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/equipment.svg";
}

export interface EquipmentData extends Omit<EquipmentSource, "effects" | "flags"> {
    type: EquipmentSource["type"];
    data: EquipmentSystemData;
    readonly _source: EquipmentSource;
}

export type EquipmentTrait = keyof ConfigPF2e["PF2E"]["equipmentTraits"];
export type EquipmentTraits = PhysicalItemTraits<EquipmentTrait>;

export interface EquipmentSystemSource extends Investable<PhysicalSystemSource> {
    traits: EquipmentTraits;
}

export type EquipmentSystemData = EquipmentSystemSource & PhysicalSystemData;
