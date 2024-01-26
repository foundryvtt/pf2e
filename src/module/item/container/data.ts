import { EquipmentTrait } from "@item/equipment/data.ts";
import {
    BasePhysicalItemSource,
    BulkData,
    Investable,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data.ts";

type ContainerSource = BasePhysicalItemSource<"backpack", ContainerSystemSource>;

type ContainerTraits = PhysicalItemTraits<EquipmentTrait>;

interface ContainerSystemSource extends Investable<PhysicalSystemSource> {
    traits: ContainerTraits;
    stowing: boolean;
    bulk: ContainerBulkSource;
    collapsed: boolean;
    usage: { value: string };
    subitems?: never;
}

interface ContainerBulkSource {
    value: number;
    heldOrStowed: number;
    capacity: number;
    ignored: number;
}

interface ContainerSystemData
    extends Omit<ContainerSystemSource, SourceOmission>,
        Omit<Investable<PhysicalSystemData>, "subitems" | "traits"> {
    bulk: ContainerBulkData;
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

interface ContainerBulkData extends ContainerBulkSource, BulkData {}

export type { ContainerBulkData, ContainerSource, ContainerSystemData };
