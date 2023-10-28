import { ActionTrait } from "@item/ability/types.ts";
import { ArmorTrait } from "@item/armor/types.ts";
import { ConsumableTrait } from "@item/consumable/data.ts";
import { EquipmentTrait } from "@item/equipment/data.ts";
import { WeaponTrait } from "@item/weapon/types.ts";
import { Size, TraitsWithRarity, ValuesList } from "@module/data.ts";
import { ActionCost, BaseItemSourcePF2e, Frequency, ItemSystemData, ItemSystemSource } from "../base/data/system.ts";
import type { ITEM_CARRY_TYPES } from "../base/data/values.ts";
import type { CoinsPF2e } from "./helpers.ts";
import { PhysicalItemType, PreciousMaterialGrade, PreciousMaterialType } from "./types.ts";
import { UsageDetails } from "./usage.ts";

type ItemCarryType = SetElement<typeof ITEM_CARRY_TYPES>;

type BasePhysicalItemSource<
    TType extends PhysicalItemType,
    TSystemSource extends PhysicalSystemSource = PhysicalSystemSource,
> = BaseItemSourcePF2e<TType, TSystemSource>;

interface PhysicalSystemSource extends ItemSystemSource {
    level: { value: number };
    traits: PhysicalItemTraits;
    quantity: number;
    baseItem: string | null;
    hp: PhysicalItemHPSource;
    hardness: number;
    weight: {
        value: string;
    };
    equippedBulk: {
        value: string | null;
    };
    /** This is unused, remove when inventory bulk refactor is complete */
    unequippedBulk: {
        value: string;
    };
    price: PartialPrice;
    equipped: EquippedData;
    identification: IdentificationSource;
    stackGroup: string | null;
    negateBulk: {
        value: string;
    };
    containerId: string | null;
    material: ItemMaterialData;
    size: Size;
    usage: {
        value: string;
    };
    activations?: Record<string, ItemActivation>;
    temporary?: boolean;
}

interface PhysicalSystemData extends PhysicalSystemSource, Omit<ItemSystemData, "level"> {
    hp: PhysicalItemHitPoints;
    price: Price;
    bulk: BulkData;
    material: ItemMaterialData;
    traits: PhysicalItemTraits;
    temporary: boolean;
    identification: IdentificationData;
    usage: UsageDetails;
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
    /** Worn bulk, if different than when held or stowed */
    worn: number | null;
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

type IdentifiedData = DeepPartial<MystifiedData>;

interface IdentificationSource {
    status: IdentificationStatus;
    unidentified: MystifiedData;
    misidentified: object;
}

interface IdentificationData extends IdentificationSource {
    identified: MystifiedData;
}

type EquippedData = {
    carryType: ItemCarryType;
    inSlot?: boolean;
    handsHeld?: number;
    invested?: boolean | null;
};

type PhysicalItemTrait = ArmorTrait | ConsumableTrait | EquipmentTrait | WeaponTrait;
interface PhysicalItemTraits<T extends PhysicalItemTrait = PhysicalItemTrait> extends TraitsWithRarity<T> {
    otherTags: string[];
}

interface ItemMaterialData {
    grade: PreciousMaterialGrade | null;
    type: PreciousMaterialType | null;
}

interface ItemActivation {
    id: string;
    description: {
        value: string;
    };
    actionCost: ActionCost;
    components: {
        command: boolean;
        envision: boolean;
        interact: boolean;
        cast: boolean;
    };
    frequency?: Frequency;
    traits: ValuesList<ActionTrait>;
}

interface PhysicalItemHPSource {
    value: number;
    max: number;
}

interface PhysicalItemHitPoints extends PhysicalItemHPSource {
    brokenThreshold: number;
}

interface Coins {
    pp?: number;
    gp?: number;
    sp?: number;
    cp?: number;
}

interface PartialPrice {
    value: Coins;
    per?: number;
}

interface Price extends PartialPrice {
    value: CoinsPF2e;
    per: number;
}

export type {
    BasePhysicalItemSource,
    BulkData,
    Coins,
    EquippedData,
    IdentificationData,
    IdentificationStatus,
    IdentifiedData,
    Investable,
    ItemActivation,
    ItemCarryType,
    ItemMaterialData,
    MystifiedData,
    PartialPrice,
    PhysicalItemHPSource,
    PhysicalItemHitPoints,
    PhysicalItemTrait,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
    Price,
};
