import type { CreatureSheetData } from "@actor/creature/sheet.ts";
import type { HitPointsStatistic } from "@actor/data/base.ts";
import type { AbilityViewData } from "@actor/sheet/data-types.ts";
import type { MovementType, SaveType, SkillSlug } from "@actor/types.ts";
import type { ImageFilePath, VideoFilePath } from "@common/constants.d.mts";
import type { ItemPF2e } from "@item";
import type { SpellcastingSheetData } from "@item/spellcasting-entry/index.ts";
import type { ZeroToFour } from "@module/data.ts";
import type { NPCAttackTraitOrTag, TagifyEntry } from "@module/sheet/helpers.ts";
import type { ArmorClassTraceData } from "@system/statistic/index.ts";
import type { NPCAttributes, NPCPerceptionData, NPCSaveData, NPCSkillData, NPCSystemData } from "./data.ts";
import type { NPCPF2e } from "./index.ts";

interface ActionsDetails {
    label: string;
    actions: AbilityViewData[];
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
    perception: NPCPerceptionData & WithAdjustments & WithRank;
    attributes: NPCAttributes & {
        ac: ArmorClassTraceData & WithAdjustments;
        hp: HitPointsStatistic & WithAdjustments;
    };
    details: NPCSystemData["details"] & {
        level: NPCSystemData["details"]["level"] & WithAdjustments;
    };
    saves: Record<SaveType, NPCSaveData & WithAdjustments & WithRank & { labelShort?: string }>;
    skills: Record<SkillSlug, NPCSkillSheetData>;
}

interface NPCStrikeSheetData {
    id: string;
    name: string;
    sort: number;
    variants: { label: string; breakdown: string | null }[];
    attackType: string;
    glyph: string;
    /** A list of traits or tags to show next to the strike. */
    traitsAndTags: NPCAttackTraitOrTag[];
    description: string | null;
    /** The damage formula of the strike for display on sheets */
    damageFormula: string | null;
}

interface NPCSpellcastingSheetData extends SpellcastingSheetData {
    adjustedHigher?: { dc: boolean; mod: boolean };
    adjustedLower?: { dc: boolean; mod: boolean };
}

/** Additional fields added in sheet data preparation */
interface NPCSheetData extends CreatureSheetData<NPCPF2e> {
    attacks: NPCStrikeSheetData[];
    actions: NPCActionSheetData;
    data: NPCSystemSheetData;
    items: NPCSheetItemData<ItemPF2e<NPCPF2e>>[];
    spellcastingEntries: SpellcastingSheetData[];
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
    traitTagifyData: TagifyEntry[];
    speeds: Record<"land", NPCSpeedSheetData & { details: string }> &
        Record<Exclude<MovementType, "land">, NPCSpeedSheetData | null>;
}

interface NPCSpeedSheetData {
    value: number;
    label: string;
    adjustedHigher: boolean;
    adjustedLower: boolean;
}

type NPCSheetItemData<TItem extends ItemPF2e<NPCPF2e>> = Omit<TItem["_source"], "traits"> & {
    glyph: string;
    traits: {
        label: string;
        description?: string;
    }[];
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
