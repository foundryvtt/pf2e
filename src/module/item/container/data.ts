import { EquipmentTrait } from "@item/equipment/data.ts";
import {
    BasePhysicalItemSource,
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
    bulkCapacity: {
        value: string | null;
    };
    collapsed: boolean;
}

interface ContainerSystemData
    extends Omit<ContainerSystemSource, "identification" | "price" | "temporary" | "usage">,
        Omit<Investable<PhysicalSystemData>, "traits"> {}

export { ContainerSource, ContainerSystemData };
