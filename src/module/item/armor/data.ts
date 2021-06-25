import {
    BasePhysicalItemData,
    BasePhysicalItemSource,
    MagicItemSystemData,
    PhysicalItemTraits,
} from '@item/physical/data';
import { ZeroToFour } from '@module/data';
import type { LocalizePF2e } from '@module/system/localize';
import type { ArmorPF2e } from '.';

export type ArmorSource = BasePhysicalItemSource<'armor', ArmorSystemData>;

export class ArmorData extends BasePhysicalItemData<ArmorPF2e> {
    static override DEFAULT_ICON: ImagePath = 'systems/pf2e/icons/default-icons/armor.svg';
}

export interface ArmorData extends Omit<ArmorSource, '_id' | 'effects'> {
    type: ArmorSource['type'];
    data: ArmorSource['data'];
    readonly _source: ArmorSource;
}

export type ArmorTrait = keyof ConfigPF2e['PF2E']['armorTraits'];
type ArmorTraits = PhysicalItemTraits<ArmorTrait>;

export type ArmorCategory = keyof ConfigPF2e['PF2E']['armorTypes'];
export type ArmorGroup = keyof ConfigPF2e['PF2E']['armorGroups'];
export type BaseArmorType = keyof typeof LocalizePF2e.translations.PF2E.Item.Armor.Base;
export type ResilientRuneType = '' | 'resilient' | 'greaterResilient' | 'majorResilient';

interface ArmorSystemData extends MagicItemSystemData {
    traits: ArmorTraits;
    armor: {
        value: number;
    };
    armorType: {
        value: ArmorCategory;
    };
    baseItem: BaseArmorType | null;

    group: {
        value: ArmorGroup | null;
    };
    strength: {
        value: number;
    };
    dex: {
        value: number;
    };
    check: {
        value: number;
    };
    speed: {
        value: number;
    };
    potencyRune: {
        value: ZeroToFour;
    };
    resiliencyRune: {
        value: ResilientRuneType | '';
    };
    propertyRune1: {
        value: string;
    };
    propertyRune2: {
        value: string;
    };
    propertyRune3: {
        value: string;
    };
    propertyRune4: {
        value: string;
    };
}
