import { CreatureSheetData } from "@actor/creature/types.ts";
import { HitPointsStatistic, PerceptionData } from "@actor/data/base.ts";
import { MovementType, SaveType, SkillAbbreviation } from "@actor/types.ts";
import type { AbilityItemPF2e, ItemPF2e } from "@item";
import { SpellcastingSheetData } from "@item/spellcasting-entry/index.ts";
import { ZeroToFour } from "@module/data.ts";
import { TraitTagifyEntry } from "@module/sheet/helpers.ts";
import type { ArmorClassTraceData } from "@system/statistic/index.ts";
import { NPCAttributes, NPCSaveData, NPCSkillData, NPCSystemData } from "./data.ts";
import type { NPCPF2e, NPCStrike } from "./index.ts";

interface ActionsDetails {
    label: string;
    actions: NPCSheetItemData<AbilityItemPF2e<NPCPF2e>>[];
}

interface NPCActionSheetData {
    passive: ActionsDetails;
    active: ActionsDetails;
}

/** Highlight such a statistic if adjusted by data preparation */
interface WithAdjustments {
    adjustedHigher?: boolean;
    adjustedLower?: boolean;
}

interface VariantCloneParams {
    name?: string;
    description?: string;
    img?: {
        actor?: ImageFilePath;
        token?: VideoFilePath;
    };
    save?: boolean;
    keepId?: boolean;
}

type WithRank = { icon?: string; hover?: string; rank: ZeroToFour };
type NPCSkillSheetData = NPCSkillData & WithAdjustments & WithRank;

interface NPCSystemSheetData extends NPCSystemData {
    actions: NPCStrikeSheetData[];
    attributes: NPCAttributes & {
        ac: ArmorClassTraceData & WithAdjustments;
        hp: HitPointsStatistic & WithAdjustments;
        perception: PerceptionData & WithAdjustments & WithRank;
    };
    details: NPCSystemData["details"] & {
        level: NPCSystemData["details"]["level"] & WithAdjustments;
        alignment: {
            localizedName?: string;
        };
    };
    sortedSkills: Record<SkillAbbreviation, NPCSkillSheetData>;
    saves: Record<SaveType, NPCSaveData & WithAdjustments & WithRank & { labelShort?: string }>;
    skills: Record<SkillAbbreviation, NPCSkillSheetData>;
}

interface NPCStrikeSheetData extends NPCStrike {
    /** The damage formula of the strike for display on sheets */
    damageFormula?: string;
}

interface NPCSpellcastingSheetData extends SpellcastingSheetData {
    adjustedHigher?: { dc: boolean; mod: boolean };
    adjustedLower?: { dc: boolean; mod: boolean };
}

/** Additional fields added in sheet data preparation */
interface NPCSheetData<TActor extends NPCPF2e = NPCPF2e> extends CreatureSheetData<TActor> {
    actions: NPCActionSheetData;
    data: NPCSystemSheetData;
    items: NPCSheetItemData<ItemPF2e<TActor>>[];
    spellcastingEntries: SpellcastingSheetData[];
    orphanedSpells: boolean;
    identificationDCs: NPCIdentificationSheetData;
    isNotCommon?: boolean;
    actorSize?: string;
    isWeak?: boolean;
    isElite?: boolean;
    eliteState: "active" | "inactive";
    weakState: "active" | "inactive";
    notAdjusted: boolean;
    hasShield?: boolean;
    hasHardness?: boolean;
    configLootableNpc?: boolean;
    traitTagifyData: TraitTagifyEntry[];
    languageDetails?: string;
    speeds: Record<"land", NPCSpeedSheetData & { details: string }> &
        Record<Exclude<MovementType, "land">, NPCSpeedSheetData | null>;
}

interface NPCSpeedSheetData {
    value: number;
    label: string;
    adjustedHigher: boolean;
    adjustedLower: boolean;
}

type NPCSheetItemData<TItem extends ItemPF2e<NPCPF2e>> = Omit<RawObject<TItem>, "traits"> & {
    glyph: string;
    imageUrl: string;
    traits: {
        label: string;
        description?: string;
    }[];
    chatData?: unknown;
    system: {
        bonus?: {
            value: number;
            total?: number;
        };
        isAgile?: boolean;
        prepared?: boolean;
        tradition?: {
            ritual: boolean;
            focus: boolean;
        };
        weaponType?: string;
    };
    hasAura: boolean;
};

interface NPCIdentificationSheetData {
    standard: string | null;
    lore: string;
}

export type {
    NPCActionSheetData,
    NPCIdentificationSheetData,
    NPCSheetData,
    NPCSheetItemData,
    NPCSkillSheetData,
    NPCSpeedSheetData,
    NPCSpellcastingSheetData,
    NPCStrikeSheetData,
    NPCSystemSheetData,
    VariantCloneParams,
};
