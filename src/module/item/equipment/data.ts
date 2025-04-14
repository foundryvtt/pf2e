import type { PhysicalItemSource } from "@item/base/data/index.ts";
import type {
    BasePhysicalItemSource,
    Investable,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
    StaffData,
} from "@item/physical/data.ts";
import type { EquipmentTrait } from "./types.ts";

type EquipmentSource = BasePhysicalItemSource<"equipment", EquipmentSystemSource>;

interface EquipmentSystemSource extends Investable<PhysicalSystemSource> {
    traits: EquipmentTraits;
    usage: { value: string };
    /** Doubly-embedded adjustments, attachments, talismans etc. */
    subitems: PhysicalItemSource[];

    /** If this is a staff, the number of charges and what spells is available on this staff */
    staff: StaffData | null;
}

interface EquipmentTraits extends PhysicalItemTraits<EquipmentTrait> {}

interface EquipmentSystemData
    extends Omit<EquipmentSystemSource, SourceOmission>,
        Omit<Investable<PhysicalSystemData>, "subitems" | "traits"> {
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

export type { EquipmentSource, EquipmentSystemData, EquipmentSystemSource, EquipmentTrait };
