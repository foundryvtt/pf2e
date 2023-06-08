import { CreatureSheetData } from "@actor/creature/types.ts";
import { HitPointsData, PerceptionData } from "@actor/data/base.ts";
import { MovementType, SaveType, SkillAbbreviation } from "@actor/types.ts";
import { ActionItemPF2e, EffectPF2e, ItemPF2e } from "@item";
import { SpellcastingSheetData } from "@item/spellcasting-entry/index.ts";
import { ZeroToFour } from "@module/data.ts";
import { TraitTagifyEntry } from "@module/sheet/helpers.ts";
import { ArmorClassTraceData } from "@system/statistic/armor-class.ts";
import { NPCAttributes, NPCSaveData, NPCSkillData, NPCSystemData } from "./data.ts";
import { NPCPF2e, NPCStrike } from "./index.ts";

interface ActionsDetails {
    label: string;
    actions: NPCSheetItemData<ActionItemPF2e<NPCPF2e>>[];
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
        hp: HitPointsData & WithAdjustments;
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
    effectItems: EffectPF2e[];
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

type NPCSheetItemData<TItem extends ItemPF2e<NPCPF2e>> = RawObject<TItem> & {
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

export {
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
