import { AttributeString } from "@actor/types.ts";
import { ActionTrait } from "@item/ability/types.ts";
import { ArmorTrait } from "@item/armor/types.ts";
import { ConsumableTrait } from "@item/consumable/data.ts";
import { EquipmentTrait } from "@item/equipment/data.ts";
import { ShieldTrait } from "@item/shield/types.ts";
import { WeaponTrait } from "@item/weapon/types.ts";
import { Size, TraitsWithRarity, ValuesList, ZeroToTwo } from "@module/data.ts";
import { MaterialDamageEffect } from "@system/damage/types.ts";
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
    activations?: Record<string, ItemActivation>;
    temporary?: boolean;

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
    traits: PhysicalItemTraits;
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

type PhysicalItemTrait = ArmorTrait | ConsumableTrait | EquipmentTrait | ShieldTrait | WeaponTrait;
interface PhysicalItemTraits<T extends PhysicalItemTrait = PhysicalItemTrait> extends TraitsWithRarity<T> {
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
    ItemMaterialSource,
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
