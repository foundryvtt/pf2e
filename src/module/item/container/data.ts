import { EquipmentTrait } from "@item/equipment/data";
import {
    BasePhysicalItemData,
    BasePhysicalItemSource,
    MagicItemSystemData,
    PhysicalItemTraits,
} from "@item/physical/data";
import { ContainerPF2e } from ".";

export type ContainerSource = BasePhysicalItemSource<"backpack", ContainerSystemData>;

export class ContainerData extends BasePhysicalItemData<ContainerPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/backpack.svg";
}

export interface ContainerData extends Omit<ContainerSource, "_id" | "effects"> {
    type: ContainerSource["type"];
    data: ContainerSource["data"];
    readonly _source: ContainerSource;
}

type ContainerTraits = PhysicalItemTraits<EquipmentTrait>;

export interface ContainerSystemData extends MagicItemSystemData {
    traits: ContainerTraits;
    capacity: {
        type: string;
        value: number;
        weightless: boolean;
    };
    currency: {
        cp: number;
        sp: number;
        gp: number;
        pp: number;
    };
}
