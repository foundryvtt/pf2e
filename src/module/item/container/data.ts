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
}

interface ContainerBulkSource {
    value: number;
    heldOrStowed: number;
    capacity: number;
    ignored: number;
}

interface ContainerSystemData
    extends Omit<
            ContainerSystemSource,
            "bulk" | "hp" | "identification" | "material" | "price" | "temporary" | "usage"
        >,
        Omit<Investable<PhysicalSystemData>, "traits"> {
    bulk: ContainerBulkData;
}

interface ContainerBulkData extends ContainerBulkSource, BulkData {}

export type { ContainerSource, ContainerBulkData, ContainerSystemData };
