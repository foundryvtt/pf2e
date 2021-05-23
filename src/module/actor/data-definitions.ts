import { BaseWeaponType, ConsumableData, ItemDataPF2e, Rarity, Size, WeaponGroup } from '@item/data/types';
import { StatisticModifier, CheckModifier, ModifierPF2e, DamageDicePF2e, MODIFIER_TYPE } from '../modifiers';
import { RollParameters } from '@system/rolls';
import { DamageType } from '@module/damage-calculation';

export type ZeroToThree = 0 | 1 | 2 | 3;
export type ZeroToFour = ZeroToThree | 4; // +1!

/** A type representing the possible PFS factions. */
export type PFSFactionString = 'EA' | 'GA' | 'HH' | 'VS' | 'RO' | 'VW';

/** A type representing the possible PFS schools. */
export type PFSSchoolString = 'none' | 'scrolls' | 'spells' | 'swords';

export type ModifierType = typeof MODIFIER_TYPE[keyof typeof MODIFIER_TYPE];

/** A roll function which can be called to roll a given skill. */
export type RollFunction = (
    event: JQuery.Event | RollParameters,
    options?: string[],
    callback?: (roll: Roll) => void,
) => void;

/** Generic { value, label, type } type used in various places in data types. */
export interface LabeledValue {
    label: string;
    value: number | string;
    type: string;
    exceptions?: string;
}
export interface LabeledString extends LabeledValue {
    value: string;
}
export interface LabeledNumber extends LabeledValue {
    value: number;
}

/** Data describing the value & modifier for a base ability score. */
export interface AbilityData {
    /** The raw value of this ability score; computed from the mod for npcs automatically. */
    value: number;
    /** The modifier for this ability; computed from the value for characters automatically. */
    mod: number;
}

/** Data describing the proficiency with a given type of check */
export interface ProficiencyData {
    /** The proficiency rank (0 untrained - 4 legendary). */
    rank: ZeroToFour;
    /** The actual modifier for this martial type. */
    value: number;
    /** A breakdown describing the how the martial proficiency value is computed. */
    breakdown: string;
    /** Is this proficiency a custom addition (not among a default set or added via system automation)? */
    custom?: boolean;
}

/** Basic skill and save data (not including custom modifiers). */
export interface RawSkillData extends ProficiencyData {
    /** The ability which this save scales off of. */
    ability: AbilityString;
    /** The raw modifier for this save (after applying all modifiers). */
    item: number;
    /** A breakdown of how the save value is determined. */
    armor?: number;
}

/** Basic initiative-relevant data. */
export interface RawInitiativeData {
    /** What skill or ability is currently being used to compute initiative. */
    ability: string;
    /** The textual name for what type of initiative is being rolled (usually includes the skill). */
    label: string;
}

/** Single source of a Dexterity modifier cap to Armor Class, including the cap value itself. */
export interface DexterityModifierCapData {
    /** The numeric value that constitutes the maximum Dexterity modifier. */
    value: number;
    /** The source of this Dex cap - usually the name of an armor, a monk stance, or a spell. */
    source: string;
}

/** Any skill or similar which provides a roll option for rolling this save. */
export interface Rollable {
    /** Roll this save or skill with the given options (caused by the given event, and with the given optional callback). */
    roll: RollFunction;
}

export interface CharacterStrikeTrait {
    /** The name of this action. */
    name: string;
    /** The label for this action which will be rendered on the UI. */
    label: string;
    /** If true, this trait is toggleable. */
    toggle: boolean;
    /** The roll this trait applies to, if relevant. */
    rollName?: string;
    /** The option that this trait applies to the roll (of type `rollName`). */
    rollOption?: string;
    /** An extra css class added to the UI marker for this trait. */
    cssClass?: string;
    /** The description of the trait */
    description?: string;
}

/** An strike which a character can use. */
export interface RawCharacterStrike {
    /** The type of action; currently just 'strike'. */
    type: 'strike';
    /** The image URL for this strike (shown on the UI). */
    imageUrl: string;
    /** The glyph for this strike (how many actions it takes, reaction, etc). */
    glyph: string;
    /** A description of this strike. */
    description: string;
    /** A description of what happens on a critical success. */
    criticalSuccess: string;
    /** A description of what happens on a success. */
    success: string;
    /** Any traits this strike has. */
    traits: CharacterStrikeTrait[];
    /** Any options always applied to this strike. */
    options: string[];

    /** Alias for `attack`. */
    roll?: RollFunction;
    /** Roll to attack with the given strike (with no MAP penalty; see `variants` for MAP penalties.) */
    attack?: RollFunction;
    /** Roll normal (non-critical) damage for this weapon. */
    damage?: RollFunction;
    /** Roll critical damage for this weapon. */
    critical?: RollFunction;

    /** A list of attack variants which apply the Multiple Attack Penalty. */
    variants: { label: string; roll: RollFunction }[];

    /** A list of ammo to choose for this attack */
    ammo?: ConsumableData[];
    /** Currently selected ammo id that will be consumed when rolling this action */
    selectedAmmoId?: string;
}

export interface RawNPCStrike extends RawCharacterStrike {
    /** The type of attack as a localization string */
    attackRollType?: string;
    /** The id of the item this strike is generated from */
    sourceId?: string;
    /** A list of all damage roll parts */
    damageBreakdown?: string[];
}

/** Basic hitpoints data fields */
export interface RawHitPointsData {
    /** The current amount of hitpoints the character has. */
    value: number;
    /** The maximum number of hitpoints this character has. */
    max: number;
    /** If defined, the amount of temporary hitpoints this character has. */
    temp?: number;
    /** Any details about hit points. */
    details?: string;
}

/** Pathfinder Society Organized Play data fields */
export interface RawPathfinderSocietyData {
    /** Number assigned to the player. */
    playerNumber: string;
    /** Number assigned to the character. */
    characterNumber: string;
    /** Is the character currently affected by a level bump? */
    levelBump: boolean;
    /** Character's current fame */
    fame: number;
    /** Character's currently slotted faction */
    currentFaction: PFSFactionString;

    /** Character's Pathfinder school */
    school: PFSSchoolString;

    /** Character's Reputation with all the factions */
    reputation: PathfinderSocietyReputation;
}

/** PFS faction reputation values */
export interface PathfinderSocietyReputation {
    EA: number;
    GA: number;
    HH: number;
    VS: number;
    RO: number;
    VW: number;
}

/** Data related to actor hitpoints. */
// expose _modifiers field to allow initialization in data preparation
export type HitPointsData = StatisticModifier & RawHitPointsData;

/** The full data for charatcer initiative. */
export type InitiativeData = CheckModifier & RawInitiativeData & Rollable;
/** The full data for character perception rolls (which behave similarly to skills). */
export type PerceptionData = StatisticModifier & RawSkillData & Rollable;
/** The full data for character AC; includes the armor check penalty. */
export type ArmorClassData = StatisticModifier &
    RawSkillData & {
        /** The armor check penalty imposed by the worn armor. */
        check?: number;
        /** The cap for the bonus that dexterity can give to AC, if any. If null, there is no cap. */
        dexCap?: DexterityModifierCapData;
    };
/** The full data for the class DC; similar to SkillData, but is not rollable. */
export type ClassDCData = StatisticModifier & RawSkillData;
/** The full skill data for a character; includes statistic modifier. */
export type SkillData = StatisticModifier & RawSkillData & Rollable;
/** The full save data for a character; includes statistic modifier and an extra `saveDetail` field for user-provided details. */
export type SaveData = SkillData & { saveDetail?: string };
/** The full data for a character action (used primarily for strikes.) */
export type CharacterStrike = StatisticModifier & RawCharacterStrike;
/** The full data for a NPC action (used primarily for strikes.) */
export type NPCStrike = StatisticModifier & RawNPCStrike;

export interface Saves {
    fortitude: SaveData;
    reflex: SaveData;
    will: SaveData;
}

export type SaveString = keyof Saves;

export interface ValuesList<T extends string = string> {
    value: T[];
    custom: string;
}

export interface BaseTraitsData {
    /** The rarity of the actor (common, uncommon, etc.) */
    rarity: { value: Rarity };
    /** The character size (such as 'med'). */
    size: { value: Size };
    /** Actual Pathfinder traits */
    traits: ValuesList;
    /** Condition immunities */
    ci: LabeledValue[];
    /** Damage immunities this actor has. */
    di: ValuesList<DamageType>;
    /** Damage resistances that this actor has. */
    dr: LabeledNumber[];
    /** Damage vulnerabilities that this actor has. */
    dv: LabeledNumber[];
}

export interface Skills {
    acr: SkillData;
    arc: SkillData;
    ath: SkillData;
    cra: SkillData;
    dec: SkillData;
    dip: SkillData;
    itm: SkillData;
    med: SkillData;
    nat: SkillData;
    occ: SkillData;
    prf: SkillData;
    rel: SkillData;
    soc: SkillData;
    ste: SkillData;
    sur: SkillData;
    thi: SkillData;
}

export type SkillAbbreviation = keyof Skills;

export interface Abilities {
    str: AbilityData;
    dex: AbilityData;
    con: AbilityData;
    int: AbilityData;
    wis: AbilityData;
    cha: AbilityData;
}

/** A type representing the possible ability strings. */
export type AbilityString = keyof Abilities;
export type Language = keyof ConfigPF2e['PF2E']['languages'];
export type Attitude = keyof ConfigPF2e['PF2E']['attitude'];
export type CreatureTrait = keyof ConfigPF2e['PF2E']['creatureTraits'];

export type SenseAcuity = 'precise' | 'imprecise' | 'vague';
export interface SenseData extends LabeledString {
    acuity?: SenseAcuity;
    source?: string;
}

export interface CreatureTraitsData extends BaseTraitsData {
    /** A list of special senses this character has. */
    senses: SenseData[];
    /** Languages which this actor knows and can speak. */
    languages: ValuesList<Language>;
    /** Attitude, describes the attitude of a npc towards the PCs, e.g. hostile, friendly */
    attitude: { value: Attitude };
    traits: ValuesList;
}

export interface ActorSystemData {
    traits: BaseTraitsData;
    tokenEffects: TemporaryEffect[];
}

/** Miscallenous but mechanically relevant creature attributes.  */
interface BaseCreatureAttributes {
    hp: HitPointsData;
    ac: { value: number };
    perception: { value: number };
}

export interface CreatureSystemData extends ActorSystemData {
    /** Traits, languages, and other information. */
    traits: CreatureTraitsData;

    attributes: CreatureAttributes;

    /** Maps roll types -> a list of modifiers which should affect that roll type. */
    customModifiers: Record<string, ModifierPF2e[]>;
    /** Maps damage roll types -> a list of damage dice which should be added to that damage roll type. */
    damageDice: Record<string, DamageDicePF2e[]>;
}

export interface CategoryProficiencies {
    unarmored: ProficiencyData;
    light: ProficiencyData;
    medium: ProficiencyData;
    heavy: ProficiencyData;
    simple: ProficiencyData;
    martial: ProficiencyData;
    advanced: ProficiencyData;
    unarmed: ProficiencyData;
}
export type BaseWeaponProficiencyKey = `weapon-base-${BaseWeaponType}`;
type BaseWeaponProficiencies = Record<BaseWeaponProficiencyKey, ProficiencyData>;
export type WeaponGroupProficiencyKey = `weapon-group-${WeaponGroup}`;
type WeaponGroupProfiencies = Record<WeaponGroupProficiencyKey, ProficiencyData>;
export type CombatProficiencies = CategoryProficiencies & BaseWeaponProficiencies & WeaponGroupProfiencies;

export type CombatProficiencyKey = keyof CombatProficiencies;

interface CharacterAttributes extends BaseCreatureAttributes {
    /** The perception skill. */
    perception: PerceptionData;
    /** The class DC, used for saves related to class abilities. */
    classDC: ClassDCData;
    /** Creature armor class, used to defend against attacks. */
    ac: ArmorClassData;
    /** Initiative, used to determine turn order in combat. */
    initiative: CheckModifier;

    /** Dexterity modifier cap to AC. Undefined means no limit. */
    dexCap: DexterityModifierCapData[];

    /** The amount of bonus HP gained per level (due a feat or similar). */
    levelbonushp: number;
    /** The amount of HP provided per level by the character's class. */
    classhp: number;
    /** The amount of HP provided at level 1 by the character's ancestry. */
    ancestryhp: number;
    /** A flat bonus (i.e., not scaling with level) to hit points. */
    flatbonushp: number;
    /** A flat-bonus (i.e., not scaling with level) to stamina points. */
    flatbonussp: number;
    /** Used in variant stamina rules; how much bonus SP is gained per level. */
    levelbonussp?: number;

    /** A bonus to the maximum amount of bulk that this character can carry. */
    bonusLimitBulk: number;
    /** A bonus to the maximum amount of bulk that this character can carry without being encumbered. */
    bonusEncumbranceBulk: number;

    /** The current dying level (and maximum) for this character. */
    dying: { value: number; max: number };
    /** The current wounded level (and maximum) for this character. */
    wounded: { value: number; max: number };
    /** The current doomed level (and maximum) for this character. */
    doomed: { value: number; max: number };
    /** The current number of hero points (and maximum) for this character. */
    heroPoints: { rank: ZeroToThree; max: number };

    /** The number of familiar abilities this character's familiar has access to. */
    familiarAbilities: StatisticModifier;

    /** Data related to character hitpoints. */
    hp: HitPointsData;

    /** Data related to character stamina, when using the variant stamina rules. */
    sp: {
        /** The current number of stamina points. */
        value: number;
        /** The minimum number of stamina points (almost always '0'). */
        min: number;
        /** The maximum number of stamina points. */
        max: number;
        /** Any details about stamina points. */
        details: string;
    };

    /**
     * Data related to the currently equipped shield. This is copied from the shield data itself, and exists to
     * allow for the shield health to be shown in a token.
     */
    shield: {
        /** The current shield health. */
        value: number;
        /** The maximum shield health. */
        max: number;
        /** The shield's AC */
        ac: number;
        /** The shield's hardness */
        hardness: number;
        /** The shield's broken threshold */
        brokenThreshold: number;
        /** The current shield health (added in actor preparation) */
        hp: {
            value: number;
        };
    };

    /** Records the various land/swim/fly speeds that this actor has. */
    speed: {
        /** The actor's primary speed (usually walking/stride speed). */
        value: string;
        /** Other speeds that this actor can use (such as swim, climb, etc). */
        otherSpeeds: LabeledValue[];
        /** The derived value after applying modifiers, bonuses, and penalties */
        total: number;
    };

    /** Used in the variant stamina rules; a resource expended to regain stamina/hp. */
    resolve: { value: number };
}

export interface RollToggle {
    label: string;
    inputName: string;
    checked: boolean;
}

/** The raw information contained within the actor data object for characters. */
export interface RawCharacterData extends CreatureSystemData {
    /** The six primary ability scores. */
    abilities: Abilities;

    /** The three save types. */
    saves: Saves;

    /** Tracks proficiencies for martial skills. */
    martial: CombatProficiencies;

    /** Various details about the character, such as level, experience, etc. */
    details: {
        /** The key ability which class saves (and other class-related things) scale off of. */
        keyability: { value: AbilityString };

        /** Character alignment (LN, N, NG, etc.) */
        alignment: { value: string };
        /** Character class ('barbarian', 'fighter', etc.) */
        class: { value: string };
        /** Character ancestry (their race, generally). */
        ancestry: { value: string };
        /** Character heritage (what specific kind of race they are, like 'Warmarch Hobgoblin'). */
        heritage: { value: string };
        /** The diety that the character worships (and an image of the diety symbol). */
        deity: { value: string; image: ImagePath };
        /** Character background - their occupation, upbringing, etc. */
        background: { value: string };
        /** How old the character is (user-provided field). */
        age: { value: string };
        /** Character height (user-provided field). */
        height: { value: string };
        /** Character weight (user-provided field). */
        weight: { value: string };
        /** Character gender/pronouns (user-provided field). */
        gender: { value: string };
        /** Character ethnicity (user-provided field). */
        ethnicity: { value: string };
        /** Character nationality (i.e, what nation they hail from; user-provided field). */
        nationality: { value: string };
        /** User-provided biography for their character; value is HTML. */
        biography: { value: string; public?: string };

        /** The amount of experience this character has. */
        xp: {
            /** The current experience value.  */
            value: number;
            /** The minimum amount of experience (almost always '0'). */
            min: number;
            /** The maximum amount of experience before level up (usually '1000', but may differ.) */
            max: number;
            /** COMPUTED: The percentage completion of the current level (value / max). */
            pct: number;
        };

        /** Information about the current character level. */
        level: {
            /** The current level of this character. */
            value: number;
            /** The minimum level (almost always '1'). */
            min: number;
        };
    };

    attributes: CharacterAttributes;

    /** Player skills, used for various skill checks. */
    skills: Skills;

    /** Pathfinder Society Organized Play */
    pfs: RawPathfinderSocietyData;

    /** Special strikes which the character can take. */
    actions: CharacterStrike[];

    toggles: {
        actions: RollToggle[];
    };
}

// NPCs have an additional 'base' field used for computing the modifiers.
/** Normal armor class data, but with an additional 'base' value. */
export type NPCArmorClassData = ArmorClassData & { base?: number };
/** Normal save data, but with an additional 'base' value. */
export type NPCSaveData = SaveData & { base?: number; saveDetail: string };
/** Saves with NPCSaveData */
export interface NPCSaves {
    fortitude: NPCSaveData;
    reflex: NPCSaveData;
    will: NPCSaveData;
}
/** Normal skill data, but with an additional 'base' value. */
export type NPCPerceptionData = PerceptionData & { base?: number };
/** Normal skill data, but includes a 'base' value and whether the skill should be rendered (visible). */
export type NPCSkillData = StatisticModifier &
    Rollable & {
        base?: number;
        visible?: boolean;
        label: string;
        expanded: string;
    };

export type AlignmentString = 'LG' | 'NG' | 'CG' | 'LN' | 'N' | 'CN' | 'LE' | 'NE' | 'CE';

interface NPCInitiativeData extends RawInitiativeData {
    circumstance: number;
    status: number;
    ability: AbilityString | '';
}

export interface NPCAttributes extends BaseCreatureAttributes {
    /** The armor class of this NPC. */
    ac: NPCArmorClassData;
    /** The perception score for this NPC. */
    perception: NPCPerceptionData;

    /** Dexterity modifier cap to AC. Undefined means no limit. */
    dexCap?: DexterityModifierCapData[];

    initiative: NPCInitiativeData;

    /** The movement speeds that this NPC has. */
    speed: {
        /** The land speed for this actor. */
        value: string;
        /** A list of other movement speeds the actor possesses. */
        otherSpeeds: LabeledValue[];
    };
    /**
     * Data related to the currently equipped shield. This is copied from the shield data itself, and exists to
     * allow for the shield health to be shown in a token.
     */
    shield: {
        /** The current shield health. */
        value: number;
        /** The maximum shield health. */
        max: number;
        /** The shield's AC */
        ac: number;
        /** The shield's hardness */
        hardness: number;
        /** The shield's broken threshold */
        brokenThreshold: number;
    };
    /** Textual information about any special benefits that apply to all saves. */
    allSaves: { value: string };
    familiarAbilities: StatisticModifier;
}

/** The raw information contained within the actor data object for NPCs. */
export interface RawNPCData extends CreatureSystemData {
    /** The six primary ability scores. */
    abilities: Abilities;

    /** The three saves for NPCs. NPC saves have a 'base' score which is the score before applying custom modifiers. */
    saves: NPCSaves;

    /** Details about this actor, such as alignment or ancestry. */
    details: {
        /** The alignment this creature has. */
        alignment: { value: AlignmentString };
        /** The race of this creature. */
        ancestry: { value: string };
        /** The deity this creature worships */
        deity: { value: string; image: ImagePath };
        /** The creature level for this actor, and the minimum level (irrelevant for NPCs). */
        level: { value: number; min: number };
        /** Which sourcebook this creature comes from. */
        source: { value: string };
        /** Information about what is needed to recall knowledge about this creature. */
        recallKnowledgeText: string;
        /** Information which shows up on the sidebar of the creature. */
        sidebarText: string;
        /** The type of this creature (such as 'undead') */
        creatureType: string;
        /** Flavor / descriptive background text for this creature. */
        flavorText: string;
    };

    /** Any special attributes for this NPC, such as AC or health. */
    attributes: NPCAttributes;

    /** Skills that this actor possesses; skills the actor is actually trained on are marked 'visible'. */
    skills: Record<string, NPCSkillData>;

    /** Special strikes which the creature can take. */
    actions: NPCStrike[];
}

interface HazardAttributes {
    hasHealth: boolean;
    hp: {
        value: number;
        max: number;
        temp: number;
        details: string;
    };
    hardness: number;
    stealth: {
        value: number;
        details: string;
    };
}

/** The raw information contained within the actor data object for hazards. */
export interface RawHazardData extends ActorSystemData {
    attributes: HazardAttributes;
    /** Traits, languages, and other information. */
    traits: BaseTraitsData;
    // Fall-through clause which allows arbitrary data access; we can remove this once typing is more prevalent.
    [key: string]: any;
}

/** The raw information contained within the actor data object for loot actors. */
export interface RawLootData extends ActorSystemData {
    attributes: { [key: string]: never };
    lootSheetType: 'Merchant' | 'Loot';
    // Fall-through clause which allows arbitrary data access; we can remove this once typing is more prevalent.
    [key: string]: any;
}

interface FamiliarAttributes extends BaseCreatureAttributes {
    ac: { value: number; breakdown: string; check?: number };
    perception: { value: number } & Partial<RawSkillData> & Rollable;
    /** The movement speeds that this Familiar has. */
    speed: {
        /** The land speed for this actor. */
        value: string;
        /** A list of other movement speeds the actor possesses. */
        otherSpeeds: LabeledValue[];
    };
}

/** The raw information contained within the actor data object for familiar actors. */
export interface RawFamiliarData extends CreatureSystemData {
    attributes: FamiliarAttributes;
    master: {
        id: string | null;
        ability: AbilityString | null;
    };
    // Fall-through clause which allows arbitrary data access; we can remove this once typing is more prevalent.
    [key: string]: any;
}

/** The raw information contained within the actor data object for vehicle actors. */
export interface RawVehicleData extends ActorSystemData {
    // Fall-through clause which allows arbitrary data access; we can remove this once typing is more prevalent.
    [key: string]: any;
}

/** Shared type for all actor data; provides some basic information like name, the item array, token access, and so on. */
interface BaseActorDataPF2e<T extends ActorSystemData> extends ActorData {
    data: T;
    items: ItemDataPF2e[];
}

interface BaseCreatureData<T extends CreatureSystemData> extends BaseActorDataPF2e<T> {
    type: 'character' | 'npc' | 'familiar';
}

/** Wrapper type for character-specific data. */
export interface CharacterData extends BaseCreatureData<RawCharacterData> {
    type: 'character';
}

/** Wrapper type for npc-specific data. */
export interface NPCData extends BaseCreatureData<RawNPCData> {
    type: 'npc';
}

/** Wrapper type for hazard-specific data. */
export interface HazardData extends BaseActorDataPF2e<RawHazardData> {
    type: 'hazard';
}

/** Wrapper type for loot-specific data. */
export interface LootData extends BaseActorDataPF2e<RawLootData> {
    type: 'loot';
}

export interface FamiliarData extends BaseCreatureData<RawFamiliarData> {
    type: 'familiar';
}

/** Wrapper type for vehicle-specific data. */
export interface VehicleData extends BaseActorDataPF2e<RawVehicleData> {
    type: 'vehicle';
}

export type CreatureAttributes = CharacterAttributes | NPCAttributes | FamiliarAttributes;
export type CreatureData = CharacterData | NPCData | FamiliarData;
export type ActorDataPF2e = CreatureData | HazardData | LootData | VehicleData;

export function isCreatureData(actorData: ActorDataPF2e): actorData is CreatureData {
    return ['character', 'npc', 'familiar'].includes(actorData.type);
}
