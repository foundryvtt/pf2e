import { EquipmentTrait } from "@item/equipment/data";
import {
    BasePhysicalItemData,
    BasePhysicalItemSource,
    Investable,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
} from "@item/physical/data";
import { ContainerPF2e } from ".";

type ContainerSource = BasePhysicalItemSource<"backpack", ContainerSystemSource>;

interface ContainerData
    extends Omit<ContainerSource, "flags" | "system" | "type">,
        BasePhysicalItemData<ContainerPF2e, "backpack", ContainerSource> {}

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

export { ContainerData, ContainerSource, ContainerSystemData };
