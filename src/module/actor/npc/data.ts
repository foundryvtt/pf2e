import {
    Abilities,
    BaseCreatureData,
    BaseCreatureSource,
    CreatureAttributes,
    CreatureDetails,
    CreatureHitPoints,
    CreatureInitiative,
    CreatureSpeeds,
    CreatureSystemData,
    CreatureSystemSource,
    CreatureTraitsData,
    CreatureTraitsSource,
    HeldShieldData,
    LabeledSpeed,
    SaveData,
    SkillAbbreviation,
    SkillData,
} from "@actor/creature/data";
import { ActorFlagsPF2e, ArmorClassData, PerceptionData, StrikeData } from "@actor/data/base";
import { ActorSizePF2e } from "@actor/data/size";
import { ModifierPF2e, StatisticModifier } from "@actor/modifiers";
import { AbilityString, ActorAlliance, SaveType } from "@actor/types";
import { MeleePF2e } from "@item";
import { Rarity, Size, ValueAndMax } from "@module/data";
import { IdentifyCreatureData } from "@module/recall-knowledge";
import type { NPCPF2e } from ".";

interface NPCSource extends BaseCreatureSource<"npc", NPCSystemSource> {
    flags: DeepPartial<NPCFlags>;
}

interface NPCData
    extends Omit<NPCSource, "data" | "system" | "effects" | "items" | "prototypeToken" | "type">,
        BaseCreatureData<NPCPF2e, "npc", NPCSystemData, NPCSource> {
    flags: NPCFlags;
}

type NPCFlags = ActorFlagsPF2e & {
    pf2e: { lootable: boolean };
};

interface NPCSystemSource extends CreatureSystemSource {
    /** The six primary ability scores. */
    abilities: Abilities;

    /** Any special attributes for this NPC, such as AC or health. */
    attributes: NPCAttributesSource;

    /** Details about this actor, such as alignment or ancestry. */
    details: NPCDetailsSource;

    /** The three saves for NPCs. NPC saves have a 'base' score which is the score before applying custom modifiers. */
    saves: NPCSavesSource;

    resources: {
        focus?: ValueAndMax;
    };

    traits: NPCTraitsSource;
}

interface NPCAttributesSource {
    ac: {
        value: number;
        details: string;
    };
    adjustment: "elite" | "weak" | null;
    hp: {
        value: number;
        max: number;
        temp: number;
        details: string;
    };
    initiative: {
        ability: SkillAbbreviation | "perception";
    };
    perception: {
        value: number;
    };
    speed: {
        value: number;
        otherSpeeds: LabeledSpeed[];
        details: string;
    };
    allSaves: {
        value: string;
    };
}

type NPCSavesSource = Record<SaveType, { value: number; saveDetail: string }>;

interface NPCTraitsSource extends CreatureTraitsSource {
    /** A description of special senses this NPC has */
    senses: { value: string };
    rarity: Rarity;
    size: { value: Size };
}

/** The raw information contained within the actor data object for NPCs. */
interface NPCSystemData extends Omit<CreatureSystemData, "senses">, NPCSystemSource {
    /** The six primary ability scores. */
    abilities: Abilities;

    /** The three saves for NPCs. NPC saves have a 'base' score which is the score before applying custom modifiers. */
    saves: NPCSaves;

    /** Details about this actor, such as alignment or ancestry. */
    details: NPCDetails;

    /** Any special attributes for this NPC, such as AC or health. */
    attributes: NPCAttributes;

    /** Skills that this actor possesses; skills the actor is actually trained on are marked 'visible'. */
    skills: Record<string, NPCSkillData>;

    /** Special strikes which the creature can take. */
    actions: NPCStrike[];

    resources: {
        focus?: { value: number; max: number };
    };

    traits: NPCTraitsData;

    customModifiers: Record<string, ModifierPF2e[]>;
}

interface NPCTraitsData extends Omit<CreatureTraitsData, "senses">, NPCTraitsSource {
    rarity: Rarity;
    size: ActorSizePF2e;
}

interface NPCDetailsSource extends Omit<CreatureDetails, "creature"> {
    level: {
        value: number;
    };

    /** Which sourcebook this creature comes from. */
    source: {
        value: string;
        author: string;
    };

    /** The type of this creature (such as 'undead') */
    creatureType: string;
    /** A very brief description */
    blurb: string;
    /** The in depth descripton and any other public notes */
    publicNotes: string;
    /** The private GM notes */
    privateNotes: string;
}

interface NPCDetails extends NPCDetailsSource {
    level: {
        value: number;
        /** The presence of a `base` that is different from the `value` indicates the level was adjusted. */
        base: number;
    };

    alliance: ActorAlliance;

    identification: IdentifyCreatureData;
}

/** The full data for a NPC action (used primarily for strikes.) */
interface NPCStrike extends StrikeData {
    item: Embedded<MeleePF2e>;
    /** The type of attack as a localization string */
    attackRollType?: string;
    /** The id of the item this strike is generated from */
    sourceId?: string;
    /** A list of all damage roll parts */
    damageBreakdown?: string[];
    /** Additional effects from a successful strike, like "Grab" */
    additionalEffects: { tag: string; label: string }[];
    /** A melee usage of a firearm: not available on NPC strikes */
    altUsages?: never;
}

/** AC data with an additional "base" value */
interface NPCArmorClass extends StatisticModifier, ArmorClassData {
    base?: number;
    details: string;
}

/** Save data with an additional "base" value */
interface NPCSaveData extends SaveData {
    ability: AbilityString;
    base?: number;
    saveDetail: string;
}
/** Saves with NPCSaveData */
interface NPCSaves {
    fortitude: NPCSaveData;
    reflex: NPCSaveData;
    will: NPCSaveData;
}

interface NPCHitPoints extends CreatureHitPoints {
    base?: number;
}

/** Perception data with an additional "base" value */
interface NPCPerception extends PerceptionData {
    rank?: number;
    base?: number;
}

/** Skill data with a "base" value and whether the skill should be rendered (visible) */
interface NPCSkillData extends SkillData {
    base?: number;
    visible?: boolean;
    isLore?: boolean;
    itemID?: string;
    ability: AbilityString;
    label: string;
    expanded: string;
}

interface NPCAttributes extends CreatureAttributes {
    ac: NPCArmorClass;
    adjustment: "elite" | "weak" | null;
    hp: NPCHitPoints;
    perception: NPCPerception;

    initiative: CreatureInitiative;

    speed: NPCSpeeds;
    /**
     * Data related to the currently equipped shield. This is copied from the shield data itself, and exists to
     * allow for the shield health to be shown in a token.
     */
    shield: HeldShieldData;
    /** Textual information about any special benefits that apply to all saves. */
    allSaves: { value: string };
    familiarAbilities: StatisticModifier;
}

interface NPCSpeeds extends CreatureSpeeds {
    details: string;
}

export {
    NPCArmorClass,
    NPCAttributes,
    NPCAttributesSource,
    NPCData,
    NPCFlags,
    NPCHitPoints,
    NPCPerception,
    NPCSaveData,
    NPCSkillData,
    NPCSource,
    NPCStrike,
    NPCSystemData,
    NPCSystemSource,
    NPCTraitsData,
};
