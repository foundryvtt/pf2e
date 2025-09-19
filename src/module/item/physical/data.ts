import type { AttributeString } from "@actor/types.ts";
import type { ImageFilePath } from "@common/constants.d.mts";
import type { PhysicalItemSource } from "@item/base/data/index.ts";
import type { Size, TraitsWithRarity, ZeroToTwo } from "@module/data.ts";
import type { MaterialDamageEffect } from "@system/damage/types.ts";
import type { BaseItemSourcePF2e, ItemSystemData, ItemSystemSource, TraitConfig } from "../base/data/system.ts";
import type { ITEM_CARRY_TYPES } from "../base/data/values.ts";
import type { Coins } from "./helpers.ts";
import type { PhysicalItemTrait, PhysicalItemType, PreciousMaterialGrade, PreciousMaterialType } from "./types.ts";
import type { UsageDetails } from "./usage.ts";

type ItemCarryType = (typeof ITEM_CARRY_TYPES)[number];

type BasePhysicalItemSource<
    TType extends PhysicalItemType,
    TSystemSource extends PhysicalSystemSource = PhysicalSystemSource,
> = BaseItemSourcePF2e<TType, TSystemSource>;

interface PhysicalSystemSource extends ItemSystemSource {
    level: { value: number };
    traits: PhysicalItemTraits<PhysicalItemTrait>;
    quantity: number;
    baseItem: string | null;
    bulk: {
        value: number;
    };
    hp: PhysicalItemHPSource;
    hardness: number;
    price: PartialPrice;
    equipped: EquippedData;
    identification: IdentificationSource;
    containerId: string | null;
    material: ItemMaterialSource;
    size: Size;
    usage?: { value: string };
    temporary?: boolean;
    subitems?: PhysicalItemSource[];

    /**
     * Data for apex items: the attribute upgraded and, in case of multiple apex items, whether the upgrade has been
     * selected
     */
    apex?: {
        attribute: AttributeString;
        selected?: boolean;
    };
}

interface IdentificationSource {
    status: IdentificationStatus;
    unidentified: MystifiedData;
    misidentified: object;
}

interface ItemMaterialSource {
    grade: PreciousMaterialGrade | null;
    type: PreciousMaterialType | null;
}

interface PhysicalSystemData extends Omit<PhysicalSystemSource, "description">, Omit<ItemSystemData, "level"> {
    apex?: {
        attribute: AttributeString;
        selected: boolean;
    };
    hp: PhysicalItemHitPoints;
    price: Price;
    bulk: BulkData;
    material: ItemMaterialData;
    traits: PhysicalItemTraits<PhysicalItemTrait>;
    temporary: boolean;
    identification: IdentificationData;
    usage: UsageDetails;
    stackGroup: string | null;
}

type Investable<TData extends PhysicalSystemData | PhysicalSystemSource> = TData & {
    equipped: {
        invested: boolean | null;
    };
};

/** The item's bulk in Light bulk units, given the item is of medium size */
interface BulkData {
    /** Held or stowed bulk */
    heldOrStowed: number;
    /** The applicable bulk value between the above two */
    value: number;
    /** The quantity of this item necessary to amount to the above bulk quantities: anything less is negligible */
    per: number;
}

type IdentificationStatus = "identified" | "unidentified";

interface MystifiedData {
    name: string;
    img: ImageFilePath;
    data: {
        description: {
            value: string;
        };
    };
}

interface ItemMaterialData extends ItemMaterialSource {
    effects: MaterialDamageEffect[];
}

type IdentifiedData = DeepPartial<MystifiedData>;

interface IdentificationData extends IdentificationSource {
    identified: MystifiedData;
}

type EquippedData = {
    carryType: ItemCarryType;
    inSlot?: boolean;
    handsHeld?: ZeroToTwo;
    invested?: boolean | null;
};

interface PhysicalItemTraits<T extends PhysicalItemTrait> extends TraitsWithRarity<T> {
    otherTags: string[];
    config?: TraitConfig;
}

interface PhysicalItemHPSource {
    value: number;
    max: number;
}

interface PhysicalItemHitPoints extends PhysicalItemHPSource {
    brokenThreshold: number;
}

type RawCoins = {
    pp?: number;
    gp?: number;
    sp?: number;
    cp?: number;
};

interface PartialPrice {
    value: RawCoins;
    per?: number;
    /** Whether the price adjusts according to its size */
    sizeSensitive?: boolean;
}

interface Price extends Required<PartialPrice> {
    value: Coins;
}

export type {
    BasePhysicalItemSource,
    BulkData,
    EquippedData,
    IdentificationData,
    IdentificationStatus,
    IdentifiedData,
    Investable,
    ItemCarryType,
    ItemMaterialData,
    ItemMaterialSource,
    MystifiedData,
    PartialPrice,
    PhysicalItemHitPoints,
    PhysicalItemHPSource,
    PhysicalItemTrait,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
    Price,
    RawCoins,
};
