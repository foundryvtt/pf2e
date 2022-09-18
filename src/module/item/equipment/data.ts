import {
    BasePhysicalItemData,
    BasePhysicalItemSource,
    Investable,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data";
import type { EquipmentPF2e } from ".";
import { EquipmentTrait, OtherEquipmentTag } from "./types";

type EquipmentSource = BasePhysicalItemSource<"equipment", EquipmentSystemSource>;

type EquipmentData = Omit<EquipmentSource, "system" | "effects" | "flags"> &
    BasePhysicalItemData<EquipmentPF2e, "equipment", EquipmentSystemData, EquipmentSource>;

interface EquipmentSystemSource extends Investable<PhysicalSystemSource> {
    traits: EquipmentTraits;
}

interface EquipmentSystemData
    extends Omit<EquipmentSystemSource, "identification" | "price" | "temporary" | "usage">,
        Omit<Investable<PhysicalSystemData>, "traits"> {}

interface EquipmentTraits extends PhysicalItemTraits<EquipmentTrait> {
    otherTags: OtherEquipmentTag[];
}

export { EquipmentData, EquipmentSource, EquipmentSystemData, EquipmentSystemSource, EquipmentTrait };
