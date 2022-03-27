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

class ContainerData extends BasePhysicalItemData<ContainerPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/backpack.svg";
}

interface ContainerData extends Omit<ContainerSource, "effects" | "flags"> {
    type: ContainerSource["type"];
    data: ContainerSystemData;
    readonly _source: ContainerSource;
}

type ContainerTraits = PhysicalItemTraits<EquipmentTrait>;

interface ContainerSystemSource extends Investable<PhysicalSystemSource> {
    traits: ContainerTraits;
    stowing: boolean;
    bulkCapacity: {
        value: string | null;
    };
    collapsed: boolean;
}

type ContainerSystemData = ContainerSystemSource & PhysicalSystemData;

export { ContainerData, ContainerSource };
