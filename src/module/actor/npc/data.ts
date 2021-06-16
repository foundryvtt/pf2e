import {
    Abilities,
    Alignment,
    BaseCreatureAttributes,
    BaseCreatureData,
    BaseCreatureSource,
    CreatureSystemData,
    SaveData,
} from '@actor/creature/data';
import {
    ArmorClassData,
    DexterityModifierCapData,
    PerceptionData,
    RawInitiativeData,
    Rollable,
    StrikeData,
} from '@actor/data/base';
import { StatisticModifier } from '@module/modifiers';
import { LabeledValue } from '@module/data';
import type { NPCPF2e } from '.';

export type NPCSource = BaseCreatureSource<'npc', NPCSystemData>;

export class NPCData extends BaseCreatureData<NPCPF2e, NPCSystemData> {
    static override DEFAULT_ICON: ImagePath = 'systems/pf2e/icons/default-icons/npc.svg';
}

export interface NPCData extends Omit<NPCSource, 'effects' | 'items' | 'token'> {
    readonly type: NPCSource['type'];
    data: NPCSource['data'];
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
        level: { value: number };
        /** Which sourcebook this creature comes from. */
        source: { value: string };
        /** Information about what is needed to recall knowledge about this creature. */
        recallKnowledgeText: string;
        /** The type of this creature (such as 'undead') */
        creatureType: string;
    };

    /** Any special attributes for this NPC, such as AC or health. */
    attributes: NPCAttributes;

    /** Skills that this actor possesses; skills the actor is actually trained on are marked 'visible'. */
    skills: Record<string, NPCSkillData>;

    /** Special strikes which the creature can take. */
    actions: NPCStrike[];
}

interface RawNPCStrike extends StrikeData {
    /** The type of attack as a localization string */
    attackRollType?: string;
    /** The id of the item this strike is generated from */
    sourceId?: string;
    /** A list of all damage roll parts */
    damageBreakdown?: string[];
}

/** The full data for a NPC action (used primarily for strikes.) */
export type NPCStrike = StatisticModifier & RawNPCStrike;

// NPCs have an additional 'base' field used for computing the modifiers.
/** Normal armor class data, but with an additional 'base' value. */
type NPCArmorClassData = ArmorClassData & { base?: number };
/** Normal save data, but with an additional 'base' value. */
type NPCSaveData = SaveData & { base?: number; saveDetail: string };
/** Saves with NPCSaveData */
interface NPCSaves {
    fortitude: NPCSaveData;
    reflex: NPCSaveData;
    will: NPCSaveData;
}

/** Normal skill data, but with an additional 'base' value. */
type NPCPerceptionData = PerceptionData & { base?: number };
/** Normal skill data, but includes a 'base' value and whether the skill should be rendered (visible). */
export interface NPCSkillData extends StatisticModifier, Rollable {
    base?: number;
    visible?: boolean;
    label: string;
    expanded: string;
}

interface NPCInitiativeData extends RawInitiativeData {
    circumstance: number;
    status: number;
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
