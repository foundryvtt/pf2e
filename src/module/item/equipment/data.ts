import {
    BasePhysicalItemData,
    BasePhysicalItemSource,
    MagicItemSystemData,
    PhysicalItemTraits,
} from "@item/physical/data";
import type { EquipmentPF2e } from ".";

export type EquipmentSource = BasePhysicalItemSource<"equipment", EquipmentSystemData>;

export class EquipmentData extends BasePhysicalItemData<EquipmentPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/equipment.svg";
}

export interface EquipmentData extends Omit<EquipmentSource, "_id" | "effects"> {
    type: EquipmentSource["type"];
    data: EquipmentSource["data"];
    readonly _source: EquipmentSource;
}

export type EquipmentTrait = keyof ConfigPF2e["PF2E"]["equipmentTraits"];
type EquipmentTraits = PhysicalItemTraits<EquipmentTrait>;

interface EquipmentSystemData extends MagicItemSystemData {
    traits: EquipmentTraits;
}
