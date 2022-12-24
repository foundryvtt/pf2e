import { ActionTrait } from "@item/action/data";
import { ArmorTrait } from "@item/armor/types";
import { ConsumableTrait } from "@item/consumable/data";
import { EquipmentTrait } from "@item/equipment/data";
import type { PhysicalItemPF2e } from "@item/physical";
import { WeaponTrait } from "@item/weapon/types";
import { Size, ValuesList } from "@module/data";
import {
    ActionCost,
    BaseItemDataPF2e,
    BaseItemSourcePF2e,
    Frequency,
    ItemLevelData,
    ItemSystemData,
    ItemSystemSource,
    ItemTraits,
} from "../data/base";
import type { ITEM_CARRY_TYPES } from "../data/values";
import { CoinsPF2e } from "./helpers";
import { PhysicalItemType, PreciousMaterialGrade, PreciousMaterialType } from "./types";
import { UsageDetails } from "./usage";

type ItemCarryType = SetElement<typeof ITEM_CARRY_TYPES>;

type BasePhysicalItemSource<
    TType extends PhysicalItemType = PhysicalItemType,
    TSystemSource extends PhysicalSystemSource = PhysicalSystemSource
> = BaseItemSourcePF2e<TType, TSystemSource>;

type BasePhysicalItemData<
    TItem extends PhysicalItemPF2e = PhysicalItemPF2e,
    TType extends PhysicalItemType = PhysicalItemType,
    TSystemData extends PhysicalSystemData = PhysicalSystemData,
    TSource extends BasePhysicalItemSource<TType> = BasePhysicalItemSource<TType>
> = Omit<BasePhysicalItemSource, "system" | "effects" | "flags"> & BaseItemDataPF2e<TItem, TType, TSystemData, TSource>;

interface PhysicalSystemSource extends ItemSystemSource, ItemLevelData {
    traits: PhysicalItemTraits;
    quantity: number;
    baseItem: string | null;
    hp: PhysicalItemHitPoints;
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
    preciousMaterial: {
        value: Exclude<PreciousMaterialType, "dragonhide" | "grisantian-pelt"> | null;
    };
    preciousMaterialGrade: {
        value: PreciousMaterialGrade | null;
    };
    size: Size;
    usage: {
        value: string;
    };
    activations?: Record<string, ItemActivation>;
    temporary?: boolean;
}

interface PhysicalSystemData extends PhysicalSystemSource, ItemSystemData {
    price: Price;
    bulk: BulkData;
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
    img: ImagePath;
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
    misidentified: {};
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
interface PhysicalItemTraits<T extends PhysicalItemTrait = PhysicalItemTrait> extends ItemTraits<T> {
    otherTags: string[];
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

interface PhysicalItemHitPoints {
    value: number;
    max: number;
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

export {
    BasePhysicalItemData,
    BasePhysicalItemSource,
    Coins,
    EquippedData,
    IdentificationData,
    IdentificationStatus,
    IdentifiedData,
    Investable,
    ItemActivation,
    ItemCarryType,
    MystifiedData,
    PartialPrice,
    PhysicalItemHitPoints,
    PhysicalItemTrait,
    PhysicalItemTraits,
    PhysicalSystemData,
    PhysicalSystemSource,
    Price,
};
