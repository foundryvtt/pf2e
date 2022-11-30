import { CreatureSheetData, SpellcastingSheetData } from "@actor/creature/types";
import { HitPointsData, PerceptionData } from "@actor/data/base";
import { SaveType } from "@actor/types";
import { ActionItemData, EffectData, ItemDataPF2e } from "@item/data";
import { ZeroToFour } from "@module/data";
import { IdentifyCreatureData } from "@module/recall-knowledge";
import { NPCPF2e } from ".";
import { NPCArmorClass, NPCAttributes, NPCSaveData, NPCSkillData, NPCSystemData, NPCTraitsData } from "./data";

interface ActionsDetails {
    label: string;
    actions: NPCSheetItemData<RawObject<ActionItemData>>[];
}

interface NPCActionSheetData {
    passive: ActionsDetails;
    free: ActionsDetails;
    reaction: ActionsDetails;
    action: ActionsDetails;
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
        actor?: ImagePath;
        token?: VideoPath;
    };
    save?: boolean;
    keepId?: boolean;
}

type WithRank = { icon?: string; hover?: string; rank: ZeroToFour };

interface NPCSystemSheetData extends NPCSystemData {
    attributes: NPCAttributes & {
        ac: NPCArmorClass & WithAdjustments;
        hp: HitPointsData & WithAdjustments;
        perception: PerceptionData & WithAdjustments & WithRank;
    };
    details: NPCSystemData["details"] & {
        level: NPCSystemData["details"]["level"] & WithAdjustments;
        alignment: {
            localizedName?: string;
        };
    };
    sortedSkills: Record<string, NPCSkillData & WithAdjustments>;
    saves: Record<SaveType, NPCSaveData & WithAdjustments & WithRank & { labelShort?: string }>;
    skills: Record<string, NPCSkillData & WithAdjustments & WithRank>;
    traits: NPCTraitsData & {
        size: {
            localizedName?: string;
        };
    };
}

interface NPCSpellcastingSheetData extends SpellcastingSheetData {
    adjustedHigher?: { dc: boolean; mod: boolean };
    adjustedLower?: { dc: boolean; mod: boolean };
}

/** Additional fields added in sheet data preparation */
interface NPCSheetData<T extends NPCPF2e = NPCPF2e> extends CreatureSheetData<T> {
    actions: NPCActionSheetData;
    data: NPCSystemSheetData;
    items: NPCSheetItemData[];
    effectItems: EffectData[];
    spellcastingEntries: SpellcastingSheetData[];
    orphanedSpells: boolean;
    identifyCreatureData: IdentifyCreatureData;
    identifySkillDC?: number;
    identifySkillAdjustment?: string;
    identifySkillProgression?: string;
    identificationSkills?: string[];
    identificationSkillList?: string;
    specificLoreDC?: number;
    specificLoreAdjustment?: string;
    specificLoreProgression?: string;
    unspecificLoreDC?: number;
    unspecificLoreAdjustment?: string;
    unspecificLoreProgression?: string;
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
}

type NPCSheetItemData<T extends ItemDataPF2e | RawObject<ItemDataPF2e> = ItemDataPF2e> = T & {
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
};

export {
    NPCActionSheetData,
    NPCSheetData,
    NPCSheetItemData,
    NPCSpellcastingSheetData,
    NPCSystemSheetData,
    VariantCloneParams,
};
