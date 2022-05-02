import {
    ActionCost,
    BaseItemDataPF2e,
    BaseItemSourcePF2e,
    ItemLevelData,
    ItemSystemData,
    ItemSystemSource,
    ItemTraits,
} from "../data/base";
import type { PhysicalItemPF2e } from "@item/physical";
import type { ITEM_CARRY_TYPES, PHYSICAL_ITEM_TYPES } from "../data/values";
import { EquipmentTrait } from "@item/equipment/data";
import { ArmorTrait } from "@item/armor/data";
import { WeaponTrait } from "@item/weapon/data";
import { ConsumableTrait } from "@item/consumable/data";
import { Size, ValuesList } from "@module/data";
import { ActionTrait } from "@item/action/data";
import { UsageDetails } from "./usage";
import { PreciousMaterialGrade, PreciousMaterialType } from "./types";

type ItemCarryType = SetElement<typeof ITEM_CARRY_TYPES>;

type BasePhysicalItemSource<
    TItemType extends PhysicalItemType = PhysicalItemType,
    TSystemSource extends PhysicalSystemSource = PhysicalSystemSource
> = BaseItemSourcePF2e<TItemType, TSystemSource>;

class BasePhysicalItemData<
    TItem extends PhysicalItemPF2e = PhysicalItemPF2e,
    TSystemData extends PhysicalSystemData = PhysicalSystemData
> extends BaseItemDataPF2e<TItem> {
    /** Prepared data */
    readonly isPhysical: true = true;
    isEquipped!: boolean;
    isIdentified!: boolean;
    isAlchemical!: boolean;
    isMagical!: boolean;
    isInvested!: boolean | null;
    isCursed!: boolean;
    isTemporary!: boolean;
    usage!: UsageDetails;
}

interface BasePhysicalItemData<TItem extends PhysicalItemPF2e = PhysicalItemPF2e>
    extends Omit<BasePhysicalItemSource, "effects" | "flags"> {
    type: PhysicalItemType;
    data: BasePhysicalItemSource["data"];

    readonly document: TItem;
    readonly _source: BasePhysicalItemSource;
}

type PhysicalItemType = SetElement<typeof PHYSICAL_ITEM_TYPES>;

interface PhysicalSystemSource extends ItemSystemSource, ItemLevelData {
    traits: PhysicalItemTraits;
    quantity: number;
    baseItem: string | null;
    hp: PhysicalItemHitPoints;
    hardness: number;
    weight: {
        value: number;
    };
    equippedBulk: {
        value: string;
    };
    unequippedBulk: {
        value: string;
    };
    price: {
        value: string;
    };
    equipped: EquippedData;
    identification: IdentificationData;
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
    traits: PhysicalItemTraits;
}

type Investable<TData extends PhysicalSystemData | PhysicalSystemSource> = TData & {
    equipped: {
        invested: boolean | null;
    };
};

interface ActivatedEffectData {
    activation: {
        type: string;
        cost: number;
        condition: string;
    };
    duration: {
        value: unknown;
        units: string;
    };
    target: {
        value: unknown;
        units: string;
        type: string;
    };
    range: {
        value: unknown;
        long: unknown;
        units: unknown;
    };
    uses: {
        value: number;
        max: number;
        per: number;
    };
}

type IdentificationStatus = "identified" | "unidentified";

interface MystifiedData {
    name: string;
    img: string;
    data: {
        description: {
            value: string;
        };
    };
}

type IdentifiedData = DeepPartial<MystifiedData>;

interface IdentificationData {
    status: IdentificationStatus;
    identified: MystifiedData;
    unidentified: MystifiedData;
    misidentified: {};
}

type EquippedData = {
    carryType: ItemCarryType;
    inSlot?: boolean;
    handsHeld?: number;
    invested?: boolean | null;
};

type PhysicalItemTrait = ArmorTrait | ConsumableTrait | EquipmentTrait | WeaponTrait;
type PhysicalItemTraits<T extends PhysicalItemTrait = PhysicalItemTrait> = ItemTraits<T>;

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
    frequency: {
        value: number;
        max: number;
        /** Gap between recharges as an ISO8601 duration, or "day" for daily prep. */
        duration: null | keyof ConfigPF2e["PF2E"]["frequencies"];
    };
    traits: ValuesList<ActionTrait>;
}

interface PhysicalItemHitPoints {
    value: number;
    max: number;
    brokenThreshold: number;
}

export {
    ActivatedEffectData,
    BasePhysicalItemData,
    BasePhysicalItemSource,
    EquippedData,
    IdentificationData,
    IdentificationStatus,
    IdentifiedData,
    Investable,
    ItemActivation,
    ItemCarryType,
    MystifiedData,
    PhysicalItemHitPoints,
    PhysicalItemTrait,
    PhysicalItemTraits,
    PhysicalItemType,
    PhysicalSystemData,
    PhysicalSystemSource,
};
