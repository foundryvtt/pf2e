import {
    BasePhysicalItemSource,
    Investable,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data";
import { EquipmentTrait, OtherEquipmentTag } from "./types";

type EquipmentSource = BasePhysicalItemSource<"equipment", EquipmentSystemSource>;

interface EquipmentSystemSource extends Investable<PhysicalSystemSource> {
    traits: EquipmentTraits;
}

interface EquipmentSystemData
    extends Omit<EquipmentSystemSource, "identification" | "price" | "temporary" | "usage">,
        Omit<Investable<PhysicalSystemData>, "traits"> {}

interface EquipmentTraits extends PhysicalItemTraits<EquipmentTrait> {
    otherTags: OtherEquipmentTag[];
}

export { EquipmentSource, EquipmentSystemData, EquipmentSystemSource, EquipmentTrait };
