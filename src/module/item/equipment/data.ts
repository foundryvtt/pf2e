import { PhysicalItemSource } from "@item/base/data/index.ts";
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
    usage: { value: string };
    /** Doubly-embedded adjustments, attachments, talismans etc. */
    subitems: PhysicalItemSource[];
}

interface EquipmentSystemData
    extends Omit<EquipmentSystemSource, SourceOmission>,
        Omit<Investable<PhysicalSystemData>, "traits"> {
    stackGroup: null;
}

type SourceOmission =
    | "apex"
    | "bulk"
    | "description"
    | "hp"
    | "identification"
    | "material"
    | "price"
    | "temporary"
    | "usage";

interface EquipmentTraits extends PhysicalItemTraits<EquipmentTrait> {
    otherTags: OtherEquipmentTag[];
}

export type { EquipmentSource, EquipmentSystemData, EquipmentSystemSource, EquipmentTrait };
