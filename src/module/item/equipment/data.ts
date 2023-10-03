import { AttributeString } from "@actor/types.ts";
import {
    BasePhysicalItemSource,
    Investable,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data.ts";
import type { EquipmentTrait, OtherEquipmentTag } from "./types.ts";

type EquipmentSource = BasePhysicalItemSource<"equipment", EquipmentSystemSource>;

interface EquipmentSystemSource extends Investable<PhysicalSystemSource> {
    traits: EquipmentTraits;

    /**
     * Data for apex items: the attribute upgraded and, in case of multiple apex items, whether the upgrade has been
     * selected
     */
    apex?: {
        attribute: AttributeString;
        selected?: boolean;
    };
}

interface EquipmentSystemData
    extends Omit<EquipmentSystemSource, "hp" | "identification" | "price" | "temporary" | "usage">,
        Omit<Investable<PhysicalSystemData>, "traits"> {
    apex?: {
        attribute: AttributeString;
        selected: boolean;
    };
}

interface EquipmentTraits extends PhysicalItemTraits<EquipmentTrait> {
    otherTags: OtherEquipmentTag[];
}

export type { EquipmentSource, EquipmentSystemData, EquipmentSystemSource, EquipmentTrait };
