import type { ActorPF2e } from "@actor/base.ts";
import type {
    Abilities,
    BaseCreatureSource,
    CreatureAttributes,
    CreatureDetails,
    CreatureDetailsSource,
    CreatureHitPointsSource,
    CreatureInitiativeSource,
    CreatureLanguagesData,
    CreaturePerceptionData,
    CreatureResources,
    CreatureResourcesSource,
    CreatureSystemData,
    CreatureSystemSource,
    CreatureTraitsSource,
    HeldShieldData,
    LabeledSpeed,
    SaveData,
    SenseData,
} from "@actor/creature/data.ts";
import type {
    ActorAttributesSource,
    ActorFlagsPF2e,
    AreaAttack,
    AttributeBasedTraceData,
    HitPointsStatistic,
    StrikeData,
} from "@actor/data/base.ts";
import { InitiativeTraceData } from "@actor/initiative.ts";
import type { Modifier, StatisticModifier } from "@actor/modifiers.ts";
import type { ActorAlliance, SaveType, SkillSlug } from "@actor/types.ts";
import type { MeleePF2e } from "@item";
import type { PublicationData, ValueAndMax } from "@module/data.ts";
import type { RawPredicate } from "@system/predication.ts";

type NPCSource = BaseCreatureSource<"npc", NPCSystemSource> & {
    flags: DeepPartial<NPCFlags>;
};

type NPCFlags = ActorFlagsPF2e & {
    pf2e: { lootable: boolean };
};

interface NPCSystemSource extends CreatureSystemSource {
    traits: NPCTraitsSource;

    /** The six primary ability scores. */
    abilities: Abilities;

    /** Any special attributes for this NPC, such as AC or health. */
    attributes: NPCAttributesSource;

    skills: Partial<Record<SkillSlug, NPCSkillSource>>;

    /** Modifier of the perception statistic */
    perception: NPCPerceptionSource;

    initiative: CreatureInitiativeSource;

    /** Details about this actor, such as alliance or level. */
    details: NPCDetailsSource;

    /** The three saves for NPCs. NPC saves have a 'base' score which is the score before applying custom modifiers. */
    saves: NPCSavesSource;

    /** Spellcasting data: currently only used for rituals */
    spellcasting?: {
        rituals?: {
            dc: number;
        };
    };

    resources: CreatureResourcesSource;
}

interface NPCSkillSource {
    base: number;
    /** Any special restriction or clarification */
    note?: string;
    /** All saved special skill modifiers */
    special?: NPCSpecialSkillSource[];
}

/** Source data for special skill modifiers (such as +9 to climb) */
interface NPCSpecialSkillSource {
    label: string;
    base: number;
    /** A predicate that will automatically enable this variant if satisfied */
    predicate?: RawPredicate;
}

interface NPCAttributesSource extends Required<ActorAttributesSource> {
    ac: {
        value: number;
        details: string;
    };
    adjustment: "elite" | "weak" | null;
    hp: NPCHitPointsSource;
    speed: {
        value: number;
        otherSpeeds: LabeledSpeed[];
        details: string;
    };
    allSaves: {
        value: string;
    };
}

interface NPCHitPointsSource extends Required<CreatureHitPointsSource> {
    details: string;
}

interface NPCPerceptionSource {
    details: string;
    mod: number;
    senses: SenseData[];
    vision: boolean;
}

interface NPCDetailsSource extends CreatureDetailsSource {
    level: {
        value: number;
    };
    languages: CreatureLanguagesData;
    /** A very brief description */
    blurb: string;
    /** The in-depth description and any other public notes */
    publicNotes: string;
    /** The private GM notes */
    privateNotes: string;
    /** Information concerning the publication from which this actor originates */
    publication: PublicationData;
}

type NPCSavesSource = Record<SaveType, { value: number; saveDetail: string }>;

interface NPCTraitsSource extends Required<CreatureTraitsSource> {}

/** The raw information contained within the actor data object for NPCs. */
interface NPCSystemData extends Omit<NPCSystemSource, "attributes" | "perception" | "traits">, CreatureSystemData {
    /** The six primary ability scores. */
    abilities: Abilities;

    /** The three saves for NPCs. NPC saves have a 'base' score which is the score before applying custom modifiers. */
    saves: NPCSaves;

    /** Details about this actor, such as alignment or ancestry. */
    details: NPCDetails;

    perception: NPCPerceptionData;

    initiative: InitiativeTraceData;

    /** Any special attributes for this NPC, such as AC or health. */
    attributes: NPCAttributes;

    /** Skills that this actor possesses; skills the actor is actually trained on are marked 'visible'. */
    skills: Record<string, NPCSkillData>;

    /** Special strikes which the creature can take. */
    actions: NPCAttackAction[];

    resources: NPCResources;

    spellcasting: {
        rituals: { dc: number };
    };

    customModifiers: Record<string, Modifier[]>;
}

interface NPCPerceptionData extends CreaturePerceptionData {
    mod: number;
}

interface NPCAttributes extends Omit<NPCAttributesSource, AttributesSourceOmission>, CreatureAttributes {
    adjustment: "elite" | "weak" | null;
    hp: NPCHitPoints;
    /**
     * Data related to the currently equipped shield. This is copied from the shield data itself, and exists to
     * allow for the shield health to be shown in a token.
     */
    shield: HeldShieldData;
    /** Textual information about any special benefits that apply to all saves. */
    allSaves: { value: string };
    familiarAbilities: StatisticModifier;

    /** A fake class DC (set to a level-based DC) for use with critical specialization effects that require it */
    classDC: { value: number };
    /** The best spell DC */
    spellDC: { value: number } | null;
    /** And a fake class-or-spell DC to go along with it */
    classOrSpellDC: { value: number };
}

type AttributesSourceOmission = "ac" | "initiative" | "immunities" | "weaknesses" | "resistances" | "speed";

interface NPCDetails extends NPCDetailsSource, CreatureDetails {
    level: {
        value: number;
        /** The presence of a `base` that is different from the `value` indicates the level was adjusted. */
        base: number;
    };

    alliance: ActorAlliance;
}

/** The full data for a NPC action (used primarily for strikes.) */
interface NPCStrike extends StrikeData {
    item: MeleePF2e<ActorPF2e>;
    /** The type of attack as a localization string */
    attackRollType: string;
    /** The id of the item this strike is generated from */
    sourceId?: string;
    /** Additional effects from a successful strike, like "Grab" */
    additionalEffects: { tag: string; label: string }[];
    /** A melee usage of a firearm: not available on NPC strikes */
    altUsages?: never;
}

interface NPCAreaAttack extends AreaAttack {
    item: MeleePF2e<ActorPF2e>;
    /** Additional effects from a successful strike, like "Grab" */
    additionalEffects: { tag: string; label: string }[];
    altUsages?: never;
}

type NPCAttackAction = NPCStrike | NPCAreaAttack;

/** Save data with an additional "base" value */
interface NPCSaveData extends SaveData {
    base?: number;
    saveDetail: string;
}
/** Saves with NPCSaveData */
interface NPCSaves {
    fortitude: NPCSaveData;
    reflex: NPCSaveData;
    will: NPCSaveData;
}

interface NPCHitPoints extends HitPointsStatistic {
    base?: number;
}

/** System Data for skill special modifiers (such as +9 to climb) */
interface NPCSpecialSkill extends NPCSpecialSkillSource {
    mod: number;
}

/** Skill data with a "base" value and whether the skill should be rendered (visible) */
interface NPCSkillData extends NPCSkillSource, AttributeBasedTraceData {
    mod: number;
    visible: boolean;
    /** Is this skill a Lore skill? */
    lore?: boolean;
    /** If this is a lore skill, what item it came from */
    itemId?: string;
    special: NPCSpecialSkill[];
}

interface NPCResources extends CreatureResources {
    /** The current number of focus points and pool size */
    focus: ValueAndMax & { cap: number };
    mythicPoints: ValueAndMax;
}

export type {
    NPCAreaAttack,
    NPCAttackAction,
    NPCAttributes,
    NPCAttributesSource,
    NPCFlags,
    NPCHitPoints,
    NPCPerceptionData,
    NPCPerceptionSource,
    NPCSaveData,
    NPCSkillData,
    NPCSkillSource,
    NPCSource,
    NPCSpecialSkillSource,
    NPCStrike,
    NPCSystemData,
    NPCSystemSource,
    NPCTraitsSource,
};
