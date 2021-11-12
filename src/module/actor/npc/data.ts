import {
    Abilities,
    Alignment,
    BaseCreatureData,
    BaseCreatureSource,
    CreatureAttributes,
    CreatureHitPoints,
    CreatureSystemData,
    SaveData,
    SkillData,
} from "@actor/creature/data";
import {
    AbilityString,
    ArmorClassData,
    DexterityModifierCapData,
    PerceptionData,
    RawInitiativeData,
    Rollable,
    StrikeData,
} from "@actor/data/base";
import { StatisticModifier } from "@module/modifiers";
import type { NPCPF2e } from ".";

export type NPCSource = BaseCreatureSource<"npc", NPCSystemData>;

export class NPCData extends BaseCreatureData<NPCPF2e, NPCSystemData> {
    static override DEFAULT_ICON: ImagePath = "systems/pf2e/icons/default-icons/npc.svg";
}

export interface NPCData extends Omit<NPCSource, "effects" | "flags" | "items" | "token"> {
    readonly type: NPCSource["type"];
    data: NPCSource["data"];
    readonly _source: NPCSource;
}

/** The raw information contained within the actor data object for NPCs. */
export interface NPCSystemData extends CreatureSystemData {
    /** The six primary ability scores. */
    abilities: Abilities;

    /** The three saves for NPCs. NPC saves have a 'base' score which is the score before applying custom modifiers. */
    saves: NPCSaves;

    /** Details about this actor, such as alignment or ancestry. */
    details: {
        /** The alignment this creature has. */
        alignment: { value: Alignment };
        /** The creature level for this actor, and the minimum level (irrelevant for NPCs). */
        level: { base?: number; value: number };
        /** Which sourcebook this creature comes from. */
        source: { value: string };
        /** The type of this creature (such as 'undead') */
        creatureType: string;
        /** A very brief description */
        blurb: string;
        /** The in depth descripton and any other public notes */
        publicNotes: string;
        /** The private GM notes */
        privateNotes: string;
    };

    /** Any special attributes for this NPC, such as AC or health. */
    attributes: NPCAttributes;

    /** Skills that this actor possesses; skills the actor is actually trained on are marked 'visible'. */
    skills: Record<string, NPCSkillData>;

    /** Special strikes which the creature can take. */
    actions: NPCStrike[];

    resources: {
        focus?: { value: number; max: number };
    };
}

interface RawNPCStrike extends StrikeData {
    /** The type of attack as a localization string */
    attackRollType?: string;
    /** The id of the item this strike is generated from */
    sourceId?: string;
    /** A list of all damage roll parts */
    damageBreakdown?: string[];
    /** Additional effects from a successful strike, like "Grab" */
    additionalEffects: { tag: string; label: string }[];
    /** A melee usage of a firearm: not available on NPC strikes */
    meleeUsage?: never;
}

/** The full data for a NPC action (used primarily for strikes.) */
export type NPCStrike = StatisticModifier & RawNPCStrike;

/** AC data with an additional "base" value */
export interface NPCArmorClass extends StatisticModifier, ArmorClassData {
    base?: number;
}

/** Save data with an additional "base" value */
export interface NPCSaveData extends SaveData {
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

export interface NPCHitPoints extends CreatureHitPoints {
    base?: number;
}

/** Perception data with an additional "base" value */
export interface NPCPerception extends PerceptionData {
    base?: number;
}

/** Skill data with a "base" value and whether the skill should be rendered (visible) */
export interface NPCSkillData extends SkillData {
    base?: number;
    visible?: boolean;
    label: string;
    expanded: string;
}

type NPCInitiativeData = RawInitiativeData & StatisticModifier & Rollable;

export interface NPCAttributes extends CreatureAttributes {
    ac: NPCArmorClass;
    hp: NPCHitPoints;
    perception: NPCPerception;

    /** Sources of the dexterity modifier cap to AC */
    dexCap: DexterityModifierCapData[];

    initiative: NPCInitiativeData;

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
