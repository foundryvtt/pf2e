import { ItemSystemData } from "@item/data/base";
import { BaseNonPhysicalItemData, BaseNonPhysicalItemSource } from "@item/data/non-physical";
import type { KitPF2e } from ".";

export type KitSource = BaseNonPhysicalItemSource<"kit", KitSystemData>;

export class KitData extends BaseNonPhysicalItemData<KitPF2e> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/kit.svg";
}

export interface KitData extends Omit<KitSource, "effects" | "flags"> {
    type: KitSource["type"];
    data: KitSource["data"];
    readonly _source: KitSource;
}

export interface KitEntryData {
    pack?: string;
    id: string;
    img: ImagePath;
    quantity: number;
    name: string;
    isContainer: boolean;
    items?: Record<string, KitEntryData>;
}

export interface KitSystemData extends ItemSystemData {
    items: Record<string, KitEntryData>;
}
