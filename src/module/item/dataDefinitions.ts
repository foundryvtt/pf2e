import { AbilityString, Proficency } from '../actor/actorDataDefinitions';
import { PF2RuleElementData } from '../rules/rulesDataDefinitions';

export type Sizes = 'tiny' | 'sm' | 'med' | 'lg' | 'huge' | 'grg';

export type Rarity = 'common' | 'uncommon' | 'rare' | 'unique';

export type ProficiencyRank = 'untrained' | 'trained' | 'expert' | 'master' | 'legendary';

export interface ItemDescriptionData {
    description: {
        value: string;
        chat: string;
        unidentified: string;
    };
    source: {
        value: string;
    };
    traits: {
        rarity: {
            value: Rarity;
        };
        value: string | string[];
    };
    options?: {
        value: string[];
    };
    rarity: {
        value: Rarity;
    };
    usage: {
        value: string;
    };
    rules?: PF2RuleElementData[];
}

export interface PhysicalDetailsData extends ItemDescriptionData {
    quantity: {
        value: number;
    };
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
    identified: {
        value: boolean;
    };
    originalName: string;
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

export interface MagicItemPropertyData {
    value: string;
    dice: number;
    die: string;
    damageType: string;
    critDice: number;
    critDie: string;
    critDamage: string;
    critDamageType: string;
}

export interface MagicItemData extends PhysicalDetailsData {
    invested?: {
        value: boolean;
    };
    property1: MagicItemPropertyData;
    property2: MagicItemPropertyData;
    property3: MagicItemPropertyData;
}

export interface BackpackDetailsData extends PhysicalDetailsData {
    capacity: {
        type: string;
        value: number;
        weightless: boolean;
    };
    currency: {
        cp: 0;
        sp: 0;
        ep: 0;
        gp: 0;
        pp: 0;
    };
}

export interface TreasureDetailsData extends PhysicalDetailsData {
    denomination: {
        value: 'pp' | 'gp' | 'sp' | 'cp';
    };
    value: {
        value: string;
    };
}

export interface WeaponDetailsData extends MagicItemData {
    weaponType: {
        value: string;
    };
    group: {
        value: string;
    };
    hands: {
        value: boolean;
    };
    bonus: {
        value: number;
    };
    damage: {
        value: string;
        dice: number;
        die: string;
        damageType: string;
        modifier: number;
    };
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
        value: string;
    };
    strikingRune: {
        value: string;
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

export interface ArmorDetailsData extends MagicItemData {
    armor: {
        value: number;
    };
    armorType: {
        value: string;
    };
    group: {
        value: string;
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
        value: string;
    };
    resiliencyRune: {
        value: string;
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

export interface KitDetailsData extends PhysicalDetailsData {
    items: { [key: number]: KitEntryData };
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

export interface MeleeDetailsData extends MagicItemData {
    attack: {
        value: string;
    };
    damageRolls: any;
    bonus: {
        value: number;
    };
    attackEffects: {
        value: any[];
    };
}

export interface ConsumableDetailsData extends MagicItemData {
    consumableType: {
        value: string;
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
}

export interface ABCFeatureEntryData {
    pack?: string;
    id: string;
    img: string;
    name: string;
    level: number;
}

export interface AncestryDetailsData {
    additionalLanguages: {
        count: number; // plus int
        value: string[];
        custom: string;
    };
    boosts: { [key: string]: { value: AbilityString[] } };
    flaws: { [key: string]: { value: AbilityString[] } };
    hp: number;
    items: { [key: number]: ABCFeatureEntryData };
    languages: {
        value: string[];
        custom: string;
    };
    speed: number;
    size: Sizes;
    traits: {
        rarity: {
            value: string;
        };
        value: string[];
    };
}

export interface BackgroundDetailsData {
    boosts: { [key: string]: { value: AbilityString[] } };
    items: { [key: number]: ABCFeatureEntryData };
    traits: {
        rarity: {
            value: string;
        };
        value: string[];
    };
    trainedLore: string;
    trainedSkills: {
        value: string[];
    };
}

export interface ClassDetailsData {
    keyAbility: { value: AbilityString[] };
    items: { [key: number]: ABCFeatureEntryData };
    traits: {
        rarity: {
            value: string;
        };
        value: string[];
    };
    hp: number;
    perception: Proficency;
    savingThrows: {
        fortitude: Proficency;
        reflex: Proficency;
        will: Proficency;
    };
    attacks: {
        simple: Proficency;
        martial: Proficency;
        advanced: Proficency;
        unarmed: Proficency;
        other: { name: string; rank: Proficency };
    };
    defenses: {
        unarmored: Proficency;
        light: Proficency;
        medium: Proficency;
        heavy: Proficency;
    };
    trainedSkills: {
        value: string[];
        additional: number;
    };
    classDC: Proficency;
    ancestryFeatLevels: { value: number[] };
    classFeatLevels: { value: number[] };
    generalFeatLevels: { value: number[] };
    skillFeatLevels: { value: number[] };
    skillIncreaseLevels: { value: number[] };
    abilityBoostLevels: { value: number[] };
}

export interface FeatDetailsData extends ItemDescriptionData {
    featType: {
        value: string;
    };
    actionType: {
        value: string;
    };
    actionCategory: {
        value: string;
    };
    actions: {
        value: string;
    };
    prerequisites: {
        value: string;
    };
}

export interface LoreDetailsData extends ItemDescriptionData {
    featType: string;
    mod: {
        value: 0;
    };
    proficient: {
        value: 0;
    };
    item: {
        value: 0;
    };
}

export interface MartialDetailsData extends ItemDescriptionData {
    proficient: {
        value: 0;
    };
    item: {
        value: 0;
    };
}

export interface ActionDetailsData extends ItemDescriptionData {
    actionType: {
        value: string;
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
    /* eslint-disable-next-line camelcase */
    skill_requirements: {
        skill: string;
        rank: string;
    };
}

export interface SpellDetailsData extends ItemDescriptionData {
    spellType: {
        value: string;
    };
    spellCategory: {
        value: string;
    };
    traditions: {
        value: [];
    };
    school: {
        value: string;
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
        value: string;
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
    tradition: {
        value: string;
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
    item: {
        value: number;
    };
    proficiency: {
        value: number;
    };
    displayLevels: Record<number, boolean>;
    slots?: {
        slot0: {
            prepared: [];
            value: 0;
            max: 0;
        };
        slot1: {
            prepared: [];
            value: 0;
            max: 0;
        };
        slot2: {
            prepared: [];
            value: 0;
            max: 0;
        };
        slot3: {
            prepared: [];
            value: 0;
            max: 0;
        };
        slot4: {
            prepared: [];
            value: 0;
            max: 0;
        };
        slot5: {
            prepared: [];
            value: 0;
            max: 0;
        };
        slot6: {
            prepared: [];
            value: 0;
            max: 0;
        };
        slot7: {
            prepared: [];
            value: 0;
            max: 0;
        };
        slot8: {
            prepared: [];
            value: 0;
            max: 0;
        };
        slot9: {
            prepared: [];
            value: 0;
            max: 0;
        };
        slot10: {
            prepared: [];
            value: 0;
            max: 0;
        };
        slot11: {
            prepared: [];
            value: 0;
            max: 0;
        };
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

export interface BaseItemDataPF2e<D extends ItemDescriptionData> extends BaseItemData {
    data: D;
}

export interface BasePhysicalItemData<D extends PhysicalDetailsData = PhysicalDetailsData>
    extends BaseItemDataPF2e<PhysicalDetailsData> {
    data: D;
}

export interface BackpackData extends BasePhysicalItemData<BackpackDetailsData & ItemLevelData> {
    type: 'backpack';
}

export interface TreasureData extends BasePhysicalItemData<TreasureDetailsData & ItemLevelData> {
    type: 'treasure';
}

export interface WeaponData extends BasePhysicalItemData<WeaponDetailsData & ItemLevelData> {
    type: 'weapon';
}

export interface ArmorData extends BasePhysicalItemData<ArmorDetailsData & ItemLevelData> {
    type: 'armor';
}

export interface KitData extends BaseItemDataPF2e<KitDetailsData> {
    type: 'kit';
}

export interface MeleeData extends BasePhysicalItemData<MeleeDetailsData> {
    type: 'melee';
}

export interface ConsumableData
    extends BasePhysicalItemData<ConsumableDetailsData & ActivatedEffectData & ItemLevelData> {
    type: 'consumable';
}

export interface EquipmentData extends BasePhysicalItemData<ActivatedEffectData & MagicItemData> {
    type: 'equipment';
}

export interface AncestryData extends BaseItemDataPF2e<ItemDescriptionData & AncestryDetailsData> {
    type: 'ancestry';
}

export interface BackgroundData extends BaseItemDataPF2e<ItemDescriptionData & BackgroundDetailsData> {
    type: 'background';
}

export interface ClassData extends BaseItemDataPF2e<ItemDescriptionData & ClassDetailsData> {
    type: 'class';
}

export interface FeatData extends BaseItemDataPF2e<FeatDetailsData & ItemLevelData> {
    type: 'feat';
}

export interface LoreData extends BaseItemDataPF2e<LoreDetailsData> {
    type: 'lore';
}

export interface MartialData extends BaseItemDataPF2e<MartialDetailsData> {
    type: 'martial';
}

export interface ActionData extends BaseItemDataPF2e<ActionDetailsData> {
    type: 'action';
}

export interface SpellData extends BaseItemDataPF2e<SpellDetailsData & ItemLevelData> {
    type: 'spell';
}

export interface SpellcastingEntryData extends BaseItemDataPF2e<SpellcastingEntryDetailsData> {
    type: 'spellcastingEntry';
}

export interface StatusData extends BaseItemDataPF2e<StatusDetailsData> {
    type: 'status';
}

export interface ConditionData extends BaseItemDataPF2e<ConditionDetailsData> {
    type: 'condition';
}

/** Actual physical items which you carry (as opposed to feats, lore, proficiencies, statuses, etc). */
export type PhysicalItemData =
    | BackpackData
    | TreasureData
    | WeaponData
    | ArmorData
    | MeleeData
    | ConsumableData
    | EquipmentData
    | KitData;

export type ItemData =
    | PhysicalItemData
    | FeatData
    | LoreData
    | MartialData
    | ActionData
    | SpellData
    | SpellcastingEntryData
    | StatusData
    | ConditionData
    | AncestryData
    | BackgroundData
    | ClassData;

/** Checks if the given item data is a physical item with a quantity and other physical fields. */
export function isPhysicalItem(item: ItemData): item is PhysicalItemData {
    return 'quantity' in item.data;
}

export function isLevelItem(item: ItemData): item is ItemData & BaseItemDataPF2e<ItemDescriptionData & ItemLevelData> {
    return 'level' in item.data;
}

/** Asserts that the given item is a physical item, throwing an error if it is not. */
export function assertPhysicalItem(item: ItemData, error: string): asserts item is PhysicalItemData {
    if (!isPhysicalItem(item)) {
        throw Error(error);
    }
}
