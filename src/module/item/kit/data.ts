import { BaseItemDataPF2e, BaseItemSourcePF2e, ItemSystemSource } from "@item/data/base";
import { PhysicalItemTraits, PartialPrice } from "@item/physical/data";
import type { KitPF2e } from ".";

type KitSource = BaseItemSourcePF2e<"kit", KitSystemSource>;

type KitData = Omit<KitSource, "system" | "effects" | "flags"> &
    BaseItemDataPF2e<KitPF2e, "kit", KitSystemData, KitSource>;

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
}

type KitSystemData = KitSystemSource;

export { KitData, KitEntryData, KitSource, KitSystemData, KitSystemSource };
