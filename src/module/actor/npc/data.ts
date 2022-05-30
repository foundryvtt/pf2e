import {
    Abilities,
    BaseCreatureData,
    BaseCreatureSource,
    CreatureAttributes,
    CreatureDetails,
    CreatureHitPoints,
    CreatureInitiative,
    CreatureSystemData,
    HeldShieldData,
    SaveData,
    SkillData,
} from "@actor/creature/data";
import {
    AbilityString,
    ActorFlagsPF2e,
    ArmorClassData,
    DexterityModifierCapData,
    PerceptionData,
    StrikeData,
} from "@actor/data/base";
import { MeleePF2e } from "@item";
import { StatisticModifier } from "@actor/modifiers";
import type { NPCPF2e } from ".";

interface NPCSource extends BaseCreatureSource<"npc", NPCSystemData> {
    flags: DeepPartial<NPCFlags>;
}

interface NPCData
    extends Omit<NPCSource, "data" | "effects" | "items" | "token" | "type">,
        BaseCreatureData<NPCPF2e, "npc", NPCSystemData, NPCSource> {
    flags: NPCFlags;
}

type NPCFlags = ActorFlagsPF2e & {
    pf2e: { lootable: boolean };
};

/** The raw information contained within the actor data object for NPCs. */
interface NPCSystemData extends CreatureSystemData {
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
}

type NPCDetails = CreatureDetails & {
    /** The presence of a `base` that is different from the `value` indicates the level was automatically adjusted. */
    level: {
        base?: number;
    };
    /** Which sourcebook this creature comes from. */
    source: {
        value: string;
        author?: string;
    };
    /** The type of this creature (such as 'undead') */
    creatureType: string;
    /** A very brief description */
    blurb: string;
    /** The in depth descripton and any other public notes */
    publicNotes: string;
    /** The private GM notes */
    privateNotes: string;
};

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
    base?: number;
}

/** Skill data with a "base" value and whether the skill should be rendered (visible) */
interface NPCSkillData extends SkillData {
    base?: number;
    visible?: boolean;
    label: string;
    expanded: string;
}

interface NPCAttributes extends CreatureAttributes {
    ac: NPCArmorClass;
    hp: NPCHitPoints;
    perception: NPCPerception;

    /** Sources of the dexterity modifier cap to AC */
    dexCap: DexterityModifierCapData[];

    initiative: CreatureInitiative;

    /**
     * Data related to the currently equipped shield. This is copied from the shield data itself, and exists to
     * allow for the shield health to be shown in a token.
     */
    shield: HeldShieldData;
    /** Textual information about any special benefits that apply to all saves. */
    allSaves: { value: string };
    familiarAbilities: StatisticModifier;
}

export {
    NPCArmorClass,
    NPCAttributes,
    NPCData,
    NPCHitPoints,
    NPCPerception,
    NPCSaveData,
    NPCSkillData,
    NPCSource,
    NPCStrike,
    NPCSystemData,
};
