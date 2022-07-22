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

type EquipmentData = Omit<EquipmentSource, "data" | "effects" | "flags"> &
    BasePhysicalItemData<EquipmentPF2e, "equipment", EquipmentSystemData, EquipmentSource>;

interface EquipmentSystemSource extends Investable<PhysicalSystemSource> {
    traits: EquipmentTraitsSource;
}

interface EquipmentSystemData
    extends Omit<EquipmentSystemSource, "price" | "temporary" | "usage">,
        Investable<PhysicalSystemData> {
    traits: EquipmentTraits;
}
interface EquipmentTraitsSource extends PhysicalItemTraits<EquipmentTrait> {
    otherTags?: OtherEquipmentTag[];
}

type EquipmentTraits = Required<EquipmentTraitsSource>;

export { EquipmentData, EquipmentSource, EquipmentSystemData, EquipmentSystemSource, EquipmentTrait };
