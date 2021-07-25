import { BaseItemDataPF2e, BaseItemSourcePF2e, ItemLevelData, ItemSystemData, ItemTraits } from '../data/base';
import type { PhysicalItemPF2e } from '@item/physical';
import type { PHYSICAL_ITEM_TYPES, PRECIOUS_MATERIAL_TYPES } from '../data/values';
import { EquipmentTrait } from '@item/equipment/data';
import { ArmorTrait } from '@item/armor/data';
import { WeaponTrait } from '@item/weapon/data';
import { ConsumableTrait } from '@item/consumable/data';
import { Size } from '@module/data';

export type BasePhysicalItemSource<
    TItemType extends PhysicalItemType = PhysicalItemType,
    TSystemData extends PhysicalSystemData = PhysicalSystemData,
> = BaseItemSourcePF2e<TItemType, TSystemData>;

export class BasePhysicalItemData<
    TItem extends PhysicalItemPF2e = PhysicalItemPF2e,
    TSystemData extends PhysicalSystemData = PhysicalSystemData,
> extends BaseItemDataPF2e<TItem> {
    /** Prepared data */
    readonly isPhysical: true = true;
    isEquipped!: boolean;
    isIdentified!: boolean;
    isAlchemical!: boolean;
    isMagical!: boolean;
    isInvested!: boolean | null;
    isCursed!: boolean;
}

export interface BasePhysicalItemData<TItem extends PhysicalItemPF2e = PhysicalItemPF2e>
    extends Omit<BasePhysicalItemSource, 'effects'> {
    type: PhysicalItemType;
    data: BasePhysicalItemSource['data'];

    readonly document: TItem;
    readonly _source: BasePhysicalItemSource;
}

export type PhysicalItemType = typeof PHYSICAL_ITEM_TYPES[number];

export interface MagicItemSystemData extends PhysicalSystemData {
    invested: {
        value: boolean | null;
    };
}

export type PreciousMaterialType = typeof PRECIOUS_MATERIAL_TYPES[number];
export type PreciousMaterialGrade = 'low' | 'standard' | 'high';

export interface ActivatedEffectData {
    activation: {
        type: string;
        cost: number;
        condition: string;
    };
    duration: {
        value: any;
        units: string;
    };
    target: {
        value: any;
        units: string;
        type: string;
    };
    range: {
        value: any;
        long: any;
        units: any;
    };
    uses: {
        value: number;
        max: number;
        per: any;
    };
}

export type IdentificationStatus = 'identified' | 'unidentified';

export interface MystifiedData {
    name: string;
    img: string;
    data: {
        description: {
            value: string;
        };
    };
}

export type IdentifiedData = DeepPartial<MystifiedData>;

export interface IdentificationData {
    status: IdentificationStatus;
    identified: MystifiedData;
    unidentified: MystifiedData;
    misidentified: {};
}

export type PhysicalItemTrait = ArmorTrait | ConsumableTrait | EquipmentTrait | WeaponTrait;
export type PhysicalItemTraits<T extends PhysicalItemTrait = PhysicalItemTrait> = ItemTraits<T>;

export interface PhysicalSystemData extends ItemSystemData, ItemLevelData {
    traits: PhysicalItemTraits;
    quantity: {
        value: number;
    };
    baseItem: string | null;
    hp: {
        value: number;
    };
    maxHp: {
        value: number;
    };
    hardness: {
        value: number;
    };
    brokenThreshold: {
        value: number;
    };
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
    equipped: {
        value: boolean;
    };
    identification: IdentificationData;
    stackGroup: {
        value: string;
    };
    bulkCapacity: {
        value: string;
    };
    negateBulk: {
        value: string;
    };
    containerId: {
        value: string | null;
    };
    preciousMaterial: {
        value: PreciousMaterialType | null;
    };
    preciousMaterialGrade: {
        value: PreciousMaterialGrade | null;
    };
    collapsed: {
        value: boolean;
    };
    size: {
        value: Size;
    };
    usage: {
        value: string;
    };
    invested?: {
        value: boolean | null;
    };
}
