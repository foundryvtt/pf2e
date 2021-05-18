import { AbilityString, CreatureTrait, ValuesList, ZeroToFour } from '@actor/data-definitions';
import { PF2RuleElementData } from '@module/rules/rules-data-definitions';
import { RollNotePF2e } from '@module/notes';
import { ConfigPF2e } from '@scripts/config';
import { PHYSICAL_ITEM_TYPES } from './values';
import { LocalizePF2e } from '@module/system/localize';
import { DamageType } from '@module/damage-calculation';
import { ItemPF2e } from '@item/base';
import { AncestryPF2e } from '@item/ancestry';
import { BackgroundPF2e } from '@item/background';
import { ClassPF2e } from '@item/class';

export type Size = 'tiny' | 'sm' | 'med' | 'lg' | 'huge' | 'grg';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'unique';
export type ProficiencyRank = 'untrained' | 'trained' | 'expert' | 'master' | 'legendary';

export type ArmorTrait = keyof ConfigPF2e['PF2E']['armorTraits'];
export type ConsumableTrait = keyof ConfigPF2e['PF2E']['consumableTraits'];
export type EquipmentTrait = keyof ConfigPF2e['PF2E']['equipmentTraits'];
export type FeatTrait = keyof ConfigPF2e['PF2E']['featTraits'];
export type SpellTrait = keyof ConfigPF2e['PF2E']['spellTraits'];
export type WeaponTrait = keyof ConfigPF2e['PF2E']['weaponTraits'];

export type PhysicalItemTrait = ArmorTrait | ConsumableTrait | EquipmentTrait | WeaponTrait;
type ItemTrait = CreatureTrait | FeatTrait | PhysicalItemTrait | SpellTrait;

export interface ItemTraits extends ValuesList {
    value: ItemTrait[];
    rarity: { value: Rarity };
}

export interface ItemDescriptionData {
    description: {
        value: string;
        chat: string;
        unidentified: string;
    };
    source: {
        value: string;
    };
    traits: ItemTraits;
    options?: {
        value: string[];
    };
    usage: {
        value: string;
    };
    rules: PF2RuleElementData[];
    slug: string | null;
}

export type IdentificationStatus = 'identified' | 'unidentified' | 'misidentified';

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
    unidentified: MystifiedData;
    misidentified: {};
}

export interface PhysicalItemTraits extends ItemTraits {
    value: PhysicalItemTrait[];
}

export interface PhysicalDetailsData extends ItemDescriptionData, ItemLevelData {
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
        value: number;
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
        value: string;
    };
    preciousMaterial: {
        value: string;
    };
    preciousMaterialGrade: {
        value: string;
    };
    collapsed: {
        value: boolean;
    };
    size: {
        value: Size;
    };
}

export interface ItemLevelData {
    level: {
        value: number;
    };
}

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

export interface MagicDetailsData extends PhysicalDetailsData {
    invested: {
        value: boolean;
    };
}

export interface ContainerDetailsData extends MagicDetailsData {
    capacity: {
        type: string;
        value: number;
        weightless: boolean;
    };
    currency: {
        cp: 0;
        sp: 0;
        gp: 0;
        pp: 0;
    };
}

export interface TreasureDetailsData extends PhysicalDetailsData {
    denomination: {
        value: 'pp' | 'gp' | 'sp' | 'cp';
    };
    value: {
        value: number;
    };
}

export type WeaponCategory = keyof ConfigPF2e['PF2E']['weaponCategories'];
export type WeaponGroup = keyof ConfigPF2e['PF2E']['weaponGroups'];
export type BaseWeaponType = keyof typeof LocalizePF2e.translations.PF2E.Weapon.Base;
interface WeaponTraits extends ItemTraits {
    value: WeaponTrait[];
}

export interface WeaponDamage {
    value: string;
    dice: number;
    die: string;
    damageType: DamageType;
    modifier: number;
}

export type StrikingRuneType = 'striking' | 'greaterStriking' | 'majorStriking';

export interface WeaponDetailsData extends MagicDetailsData {
    traits: WeaponTraits;
    weaponType: {
        value: WeaponCategory | null;
    };
    group: {
        value: WeaponGroup | null;
    };
    baseItem: BaseWeaponType | null;
    hands: {
        value: boolean;
    };
    bonus: {
        value: number;
    };
    damage: WeaponDamage;
    bonusDamage?: {
        value: string;
    };
    splashDamage?: {
        value: string;
    };
    range: {
        value: string;
    };
    reload: {
        value: string;
    };
    ability: {
        value: AbilityString;
    };
    MAP: {
        value: string;
    };
    potencyRune: {
        value: ZeroToFour;
    };
    strikingRune: {
        value: StrikingRuneType | '';
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
    property1: {
        // Refers to custom damage, *not* property runes
        value: string;
        dice: number;
        die: string;
        damageType: string;
        critDice: number;
        critDie: string;
        critDamage: string;
        critDamageType: string;
    };
    selectedAmmoId?: string;
}

export type ArmorCategory = keyof ConfigPF2e['PF2E']['armorTypes'];
export type ArmorGroup = keyof ConfigPF2e['PF2E']['armorGroups'];
export type BaseArmorType = keyof typeof LocalizePF2e.translations.PF2E.Item.Armor.Base;
export type ResilientRuneType = '' | 'resilient' | 'greaterResilient' | 'majorResilient';
export interface ArmorTraits extends ItemTraits {
    value: ArmorTrait[];
}

export interface ArmorDetailsData extends MagicDetailsData {
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

export interface KitDetailsData extends ItemDescriptionData {
    items: Record<string, KitEntryData>;
}

export interface KitEntryData {
    pack?: string;
    id: string;
    img: string;
    quantity: number;
    name: string;
    isContainer: boolean;
    items?: { [key: number]: KitEntryData };
}

export interface MeleeDamageRoll {
    damage: string;
    damageType: string;
}

export interface MeleeDetailsData extends ItemDescriptionData {
    attack: {
        value: string;
    };
    damageRolls: Record<string, MeleeDamageRoll>;
    bonus: {
        value: number;
    };
    attackEffects: {
        value: string[];
    };
    weaponType: {
        value: 'melee' | 'ranged';
    };
}

export type ConsumableType = keyof ConfigPF2e['PF2E']['consumableTypes'];
export interface ConsumableTraits extends ItemTraits {
    value: ConsumableTrait[];
}

export interface ConsumableDetailsData extends MagicDetailsData, ActivatedEffectData {
    traits: ConsumableTraits;

    consumableType: {
        value: ConsumableType;
    };
    uses: {
        value: number;
        max: number;
        per: any;
        autoUse: boolean;
        autoDestroy: boolean;
    };
    charges: {
        value: number;
        max: number;
        _deprecated: boolean;
    };
    consume: {
        value: string;
        _deprecated: boolean;
    };
    autoUse: {
        value: boolean;
        _deprecated: boolean;
    };
    autoDestroy: {
        value: boolean;
        _deprecated: boolean;
    };
    spell?: {
        data?: SpellData;
        heightenedLevel?: number;
    };
}

export interface EquipmentTraits extends ItemTraits {
    value: EquipmentTrait[];
}

export interface EquipmentDetailsData extends MagicDetailsData, ActivatedEffectData {
    traits: EquipmentTraits;
}

export interface ABCFeatureEntryData {
    pack?: string;
    id: string;
    img: string;
    name: string;
    level: number;
}

export interface CreatureTraits extends ItemTraits {
    value: CreatureTrait[];
}

export interface AncestryDetailsData extends ItemDescriptionData {
    traits: CreatureTraits;
    additionalLanguages: {
        count: number; // plus int
        value: string[];
        custom: string;
    };
    boosts: { [key: string]: { value: AbilityString[] } };
    flaws: { [key: string]: { value: AbilityString[] } };
    hp: number;
    items: Record<string, ABCFeatureEntryData>;
    languages: {
        value: string[];
        custom: string;
    };
    speed: number;
    size: Size;
    reach: number;
}

export interface BackgroundDetailsData extends ItemDescriptionData {
    boosts: { [key: string]: { value: AbilityString[] } };
    items: Record<string, ABCFeatureEntryData>;
    trainedLore: string;
    trainedSkills: {
        value: string[];
    };
}

export interface ClassDetailsData extends ItemDescriptionData {
    keyAbility: { value: AbilityString[] };
    items: Record<string, ABCFeatureEntryData>;
    hp: number;
    perception: ZeroToFour;
    savingThrows: {
        fortitude: ZeroToFour;
        reflex: ZeroToFour;
        will: ZeroToFour;
    };
    attacks: {
        simple: ZeroToFour;
        martial: ZeroToFour;
        advanced: ZeroToFour;
        unarmed: ZeroToFour;
        other: { name: string; rank: ZeroToFour };
    };
    defenses: {
        unarmored: ZeroToFour;
        light: ZeroToFour;
        medium: ZeroToFour;
        heavy: ZeroToFour;
    };
    trainedSkills: {
        value: string[];
        additional: number;
    };
    classDC: ZeroToFour;
    ancestryFeatLevels: { value: number[] };
    classFeatLevels: { value: number[] };
    generalFeatLevels: { value: number[] };
    skillFeatLevels: { value: number[] };
    skillIncreaseLevels: { value: number[] };
    abilityBoostLevels: { value: number[] };
}

export type FeatType = keyof ConfigPF2e['PF2E']['featTypes'];

interface PrerequisiteTagData {
    value: string;
}

export interface FeatDetailsData extends ItemDescriptionData, ItemLevelData {
    featType: {
        value: FeatType;
    };
    actionType: {
        value: keyof ConfigPF2e['PF2E']['actionTypes'];
    };
    actionCategory: {
        value: string;
    };
    actions: {
        value: string;
    };
    prerequisites: {
        value: PrerequisiteTagData[];
    };
    location: string;
}

export interface LoreDetailsData extends ItemDescriptionData {
    mod: {
        value: 0;
    };
    proficient: {
        value: 0;
    };
    item: {
        value: 0;
    };
    variants?: Record<string, { label: string; options: string }>;
}

export interface MartialDetailsData extends ItemDescriptionData {
    proficient: {
        value: ZeroToFour;
    };
    item: {
        value: 0;
    };
}

export interface ActionDetailsData extends ItemDescriptionData {
    actionType: {
        value: keyof ConfigPF2e['PF2E']['actionTypes'];
    };
    actionCategory: {
        value: string;
    };
    weapon: {
        value: string;
    };
    actions: {
        value: string;
    };
    requirements: {
        value: string;
    };
    trigger: {
        value: string;
    };
}

export interface TrickMagicItemCastData {
    ability: AbilityString;
    data: { spelldc: { value: number; dc: number } };
    _id: string;
}

export type MagicSchoolKey = keyof ConfigPF2e['PF2E']['magicSchools'];
interface SpellTraits extends ItemTraits {
    value: SpellTrait[];
}

export type SaveType = keyof ConfigPF2e['PF2E']['saves'];
export type MagicTraditionKey = keyof ConfigPF2e['PF2E']['magicTraditions'];

export interface SpellDetailsData extends ItemDescriptionData, ItemLevelData {
    traits: SpellTraits;
    spellType: {
        value: string;
    };
    category: {
        value: keyof ConfigPF2e['PF2E']['spellCategories'];
    };
    traditions: ValuesList<keyof ConfigPF2e['PF2E']['spellTraditions']>;
    school: {
        value: MagicSchoolKey;
    };
    components: {
        value: string;
    };
    materials: {
        value: string;
    };
    target: {
        value: string;
    };
    range: {
        value: string;
    };
    area: {
        value: keyof ConfigPF2e['PF2E']['areaSizes'];
        areaType: keyof ConfigPF2e['PF2E']['areaTypes'];
    };
    time: {
        value: string;
    };
    duration: {
        value: string;
    };
    damage: {
        value: string;
        applyMod: false;
    };
    damageType: {
        value: string;
    };
    scaling: {
        mode: string;
        formula: string;
    };
    save: {
        basic: string;
        value: SaveType | '';
        dc?: number;
        str?: string;
    };
    sustained: {
        value: false;
    };
    cost: {
        value: string;
    };
    ability: {
        value: AbilityString;
    };
    prepared: {
        value: boolean;
    };
    location: {
        value: string;
    };
    heightenedLevel: {
        value: number;
    };
    hasCounteractCheck: {
        value: boolean;
    };
    isSave?: boolean;
    damageLabel?: string;
    isAttack?: boolean;
    spellLvl?: string;
    properties?: (number | string)[];
    item?: string;
    trickMagicItemData?: TrickMagicItemCastData;
    isSignatureSpell?: boolean;
}

export interface SpellAttackRollModifier {
    breakdown: string;
    notes: RollNotePF2e[];
    roll: Function;
    value: number;
}

export interface SpellDifficultyClass {
    breakdown: string;
    notes: RollNotePF2e[];
    value: number;
}

interface SpellSlotData {
    prepared: { id: string }[];
    value: number;
    max: number;
}

export interface SpellcastingEntryDetailsData extends ItemDescriptionData {
    ability: {
        value: AbilityString | '';
    };
    spelldc: {
        value: number;
        dc: number;
        item: number;
        mod: number;
    };
    attack?: SpellAttackRollModifier;
    dc?: SpellDifficultyClass;
    tradition: {
        value: MagicTraditionKey;
    };
    focus: {
        points: number;
        pool: number;
    };
    prepared: {
        value: string;
    };
    showUnpreparedSpells: {
        value: boolean;
    };
    proficiency: {
        value: number;
    };
    displayLevels: Record<number, boolean>;
    slots: {
        slot0: SpellSlotData;
        slot1: SpellSlotData;
        slot2: SpellSlotData;
        slot3: SpellSlotData;
        slot4: SpellSlotData;
        slot5: SpellSlotData;
        slot6: SpellSlotData;
        slot7: SpellSlotData;
        slot8: SpellSlotData;
        slot9: SpellSlotData;
        slot10: SpellSlotData;
        slot11: SpellSlotData;
    };
    signatureSpells: {
        value: string[];
    };
}

export interface StatusDetailsData extends ItemDescriptionData {
    active: boolean;
    removable: boolean;
    references: {
        parent: {
            id: string;
            type: 'status' | 'condition' | 'feat' | 'weapon' | 'armor' | 'consumable' | 'equipment' | 'spell';
        };
        children: [
            {
                id: string;
                type: 'condition';
            },
        ];
        overriddenBy: [
            {
                id: string;
                type: 'condition';
            },
        ];
        overrides: [
            {
                id: string;
                type: 'condition';
            },
        ];
        /**
         * This status is immune, and thereby inactive, from the following list.
         */
        immunityFrom: [
            {
                id: string;
                type: 'status' | 'condition' | 'feat' | 'weapon' | 'armor' | 'consumable' | 'equipment' | 'spell';
            },
        ];
    };
    hud: {
        statusName: string;
        img: {
            useStatusName: boolean;
            value: string;
        };
        selectable: boolean;
    };
    duration: {
        perpetual: boolean;
        value: number;
        text: string;
    };
    modifiers: [
        {
            type: 'ability' | 'proficiency' | 'status' | 'circumstance' | 'item' | 'untyped';
            name: string;
            group: string;
            value?: number;
        },
    ];
}

export interface ConditionDetailsData extends StatusDetailsData {
    base: string;
    group: string;
    value: {
        isValued: boolean;
        immutable: boolean;
        value: number;
        modifiers: [
            {
                value: number;
                source: string;
            },
        ];
    };
    sources: {
        hud: boolean;
    };
    alsoApplies: {
        linked: [
            {
                condition: string;
                value?: number;
            },
        ];
        unlinked: [
            {
                condition: string;
                value?: number;
            },
        ];
    };
    overrides: [];
}

export interface EffectDetailsData extends ItemDescriptionData {
    level: {
        value: number;
    };
    expired: boolean;
    remaining: string;
    duration: {
        value: number;
        unit: string;
        sustained: boolean;
        expiry: 'turn-start' | 'turn-end';
    };
    start: {
        value: number;
        initiative: number | null;
    };
    tokenIcon?: {
        show: boolean;
    };
}

export type PhysicalItemType = typeof PHYSICAL_ITEM_TYPES[number];
export type ItemType =
    | 'action'
    | 'ancestry'
    | 'background'
    | 'class'
    | 'condition'
    | 'effect'
    | 'feat'
    | 'kit'
    | 'lore'
    | 'martial'
    | 'melee'
    | 'spell'
    | 'spellcastingEntry'
    | PhysicalItemType;
export type InventoryItemType = PhysicalItemType;

interface BaseItemDataPF2e<D extends ItemDescriptionData> extends ItemData {
    type: ItemType;
    data: D;

    /** Prepared data */
    isPhysical: boolean;
}

interface BasePhysicalItemData<D extends PhysicalDetailsData = PhysicalDetailsData> extends BaseItemDataPF2e<D> {
    type: PhysicalItemType;
    data: D;

    /** Prepared data */
    isPhysical: true;
    isEquipped: boolean;
    isInvested: boolean | null;
    isIdentified: boolean;
    isMagical: boolean;
    isAlchemical: boolean;
    isCursed: boolean;
}

interface BaseNonPhysicalItemData<D extends ItemDescriptionData> extends BaseItemDataPF2e<D> {
    /** Prepared data */
    isPhysical: false;
}

export interface ContainerData extends BasePhysicalItemData<ContainerDetailsData> {
    type: 'backpack';
}

export interface TreasureData extends BasePhysicalItemData<TreasureDetailsData> {
    type: 'treasure';
}

export interface WeaponData extends BasePhysicalItemData<WeaponDetailsData> {
    type: 'weapon';
}

export interface ArmorData extends BasePhysicalItemData<ArmorDetailsData> {
    type: 'armor';
}

export interface ConsumableData extends BasePhysicalItemData<ConsumableDetailsData> {
    type: 'consumable';
}

export interface EquipmentData extends BasePhysicalItemData<EquipmentDetailsData> {
    type: 'equipment';
}

export interface MeleeData extends BaseNonPhysicalItemData<MeleeDetailsData> {
    type: 'melee';
}

export interface KitData extends BaseNonPhysicalItemData<KitDetailsData> {
    type: 'kit';
}

export interface AncestryData extends BaseNonPhysicalItemData<AncestryDetailsData> {
    type: 'ancestry';
}

export interface BackgroundData extends BaseNonPhysicalItemData<BackgroundDetailsData> {
    type: 'background';
}

export interface ClassData extends BaseNonPhysicalItemData<ClassDetailsData> {
    type: 'class';
}

export interface FeatData extends BaseNonPhysicalItemData<FeatDetailsData> {
    type: 'feat';
}

export interface LoreData extends BaseNonPhysicalItemData<LoreDetailsData> {
    type: 'lore';
}

export interface MartialData extends BaseNonPhysicalItemData<MartialDetailsData> {
    type: 'martial';
}

export interface ActionData extends BaseNonPhysicalItemData<ActionDetailsData> {
    type: 'action';
}

export interface SpellData extends BaseNonPhysicalItemData<SpellDetailsData> {
    type: 'spell';

    /** Prepared data */
    isCantrip: boolean;
    isFocusSpell: boolean;
    isRitual: boolean;
}

export interface SpellcastingEntryData extends BaseNonPhysicalItemData<SpellcastingEntryDetailsData> {
    type: 'spellcastingEntry';
}

export interface ConditionData extends BaseNonPhysicalItemData<ConditionDetailsData> {
    type: 'condition';
}

export interface EffectData extends BaseNonPhysicalItemData<EffectDetailsData> {
    type: 'effect';
}

/** Actual physical items which you carry (as opposed to feats, lore, proficiencies, statuses, etc). */
export type PhysicalItemData = ContainerData | TreasureData | WeaponData | ArmorData | ConsumableData | EquipmentData;
export type MagicItemData = Exclude<PhysicalItemData, TreasureData>;

export type ItemDataPF2e =
    | PhysicalItemData
    | FeatData
    | LoreData
    | MartialData
    | MeleeData
    | ActionData
    | SpellData
    | SpellcastingEntryData
    | ConditionData
    | AncestryData
    | BackgroundData
    | ClassData
    | EffectData
    | KitData;

export function isItemSystemData(data: Record<string, any>): data is ItemDescriptionData {
    return data['description'] instanceof Object && typeof data['description']['value'] === 'string';
}

/** Checks if the given item data is a physical item with a quantity and other physical fields. */
export function isPhysicalItem(itemData: ItemDataPF2e): itemData is PhysicalItemData {
    const physicalItemTypes: readonly string[] = PHYSICAL_ITEM_TYPES;
    return physicalItemTypes.includes(itemData.type);
}

export interface TraitChatData {
    value: string;
    label: string;
    description?: string;
    mystified?: boolean;
    excluded?: boolean;
}
type ItemChatData = Omit<ItemDataPF2e['data'], 'traits'> & { traits: TraitChatData[] | ItemTraits };
type PhysicalChatData = Omit<PhysicalItemData['data'], 'traits'> & { traits: TraitChatData[] | ItemTraits };

export function isItemChatData(data: Record<string, unknown>): data is ItemChatData {
    return isItemSystemData(data);
}

export function isPhysicalChatData(data: Record<string, unknown>): data is PhysicalChatData {
    return 'quantity' in data && isItemSystemData(data);
}

export function isInventoryItem(type: string): boolean {
    switch (type) {
        case 'armor':
        case 'backpack':
        case 'consumable':
        case 'equipment':
        case 'treasure':
        case 'weapon': {
            return true;
        }
    }

    return false;
}

export function isMagicItemData(itemData: ItemDataPF2e): itemData is MagicItemData {
    return itemData.isPhysical && itemData.type !== 'treasure';
}

export function isLevelItem(
    item: ItemDataPF2e,
): item is ItemDataPF2e & BaseItemDataPF2e<ItemDescriptionData & ItemLevelData> {
    return 'level' in item.data;
}

/** Asserts that the given item is a physical item, throwing an error if it is not. */
export function assertPhysicalItem(item: ItemDataPF2e, error: string): asserts item is PhysicalItemData {
    if (!isPhysicalItem(item)) {
        throw Error(error);
    }
}

export function isABCItem(item: ItemPF2e): item is AncestryPF2e & BackgroundPF2e & ClassPF2e {
    return ['ancestry', 'background', 'class'].includes(item.type);
}
