import { BaseItemSourcePF2e, ItemSystemData, ItemSystemSource } from "@item/base/data/system.ts";
import { PartialPrice, PhysicalItemTraits } from "@item/physical/data.ts";

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

interface KitSystemData extends Omit<KitSystemSource, "description" | "traits">, Omit<ItemSystemData, "level"> {}

export type { KitEntryData, KitSource, KitSystemData, KitSystemSource };
