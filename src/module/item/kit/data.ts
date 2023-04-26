import { BaseItemSourcePF2e, ItemSystemSource } from "@item/data/base.ts";
import { PhysicalItemTraits, PartialPrice } from "@item/physical/data.ts";

type KitSource = BaseItemSourcePF2e<"kit", KitSystemSource>;

interface KitEntryData {
    uuid: ItemUUID;
    img: ImageFilePath;
    quantity: number;
    name: string;
    isContainer: boolean;
    items?: Record<string, KitEntryData>;
}

interface KitSystemSource extends ItemSystemSource {
    traits: PhysicalItemTraits;
    items: Record<string, KitEntryData>;
    price: PartialPrice;
    level?: never;
}

type KitSystemData = KitSystemSource;

export { KitEntryData, KitSource, KitSystemData, KitSystemSource };
