import {
    BasePhysicalItemData,
    BasePhysicalItemSource,
    MagicItemSystemData,
    PhysicalItemTraits,
    PreciousMaterialGrade,
    PreciousMaterialType,
} from '@item/physical/data';
import { ZeroToFour } from '@module/data';
import type { LocalizePF2e } from '@module/system/localize';
import { OneToThree, OneToFour } from '@module/data';
import type { ArmorPF2e } from '.';
import { ARMOR_PROPERTY_RUNE_TYPES } from '@item/runes';

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
export type ResilientRuneType = 'resilient' | 'greaterResilient' | 'majorResilient';
export type ArmorMaterialType = Exclude<PreciousMaterialType, 'warpglass'>;
export type ArmorPropertyRuneType = typeof ARMOR_PROPERTY_RUNE_TYPES[number];
export interface ArmorPropertyRuneSlot {
    value: ArmorPropertyRuneType | null;
}

export interface ArmorRuneData {
    potency: OneToThree | null;
    resilient: ResilientRuneType | null;
    property: Record<OneToFour, ArmorPropertyRuneType | null>;
}

/** A weapon can either be unspecific or specific along with baseline material and runes */
type SpecificArmorData =
    | {
          value: false;
      }
    | {
          value: true;
          material: {
              type: ArmorMaterialType;
              grade: PreciousMaterialGrade;
          };
          runes: Omit<ArmorRuneData, 'property'>;
      };

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
        value: ZeroToFour | null;
    };
    resiliencyRune: {
        value: ResilientRuneType | null;
    };
    // Whether the weapon is a "specific magic weapon"
    specific?: SpecificArmorData;
    propertyRune1: ArmorPropertyRuneSlot;
    propertyRune2: ArmorPropertyRuneSlot;
    propertyRune3: ArmorPropertyRuneSlot;
    propertyRune4: ArmorPropertyRuneSlot;
    preciousMaterial: {
        value: ArmorMaterialType | null;
    };
}
