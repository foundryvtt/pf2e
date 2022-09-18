import { CharacterPF2e } from "@actor";
import { AncestryPF2e, BackgroundPF2e, ClassPF2e, DeityPF2e, HeritagePF2e } from "@item";
import { MagicTradition } from "@item/spell/types";
import { CraftingEntry } from "@actor/character/crafting/entry";
import { CraftingFormula } from "@actor/character/crafting/formula";
import { FlattenedCondition } from "@system/conditions";
import { BonusFeat, CharacterSystemData, QuickCraftingData, SlottedFeat } from ".";
import { CreatureSheetData, SpellcastingSheetData } from "@actor/creature/types";
import { CHARACTER_SHEET_TABS } from "./values";

type CharacterSheetOptions = ActorSheetOptions;

type CharacterSystemSheetData = CharacterSystemData & {
    details: CharacterSystemData["details"] & {
        keyability: {
            value: keyof typeof CONFIG.PF2E.abilities;
            singleOption: boolean;
        };
    };
    effects: {
        conditions?: FlattenedCondition[];
    };
    resources: {
        heroPoints: {
            icon: string;
            hover: string;
        };
    };
};

interface CraftingEntriesSheetData {
    dailyCrafting: boolean;
    other: CraftingEntry[];
    alchemical: {
        entries: CraftingEntry[];
        totalReagentCost: number;
    };
}

interface QuickCraftingOptionsSheetData extends QuickCraftingData {
    enabled: boolean;
    resourceData?: {
        value: number;
        max: number;
    };
}

interface CraftingSheetData {
    noCost: boolean;
    quickCraftingOptions: Record<string, QuickCraftingOptionsSheetData>;
    knownFormulas: Record<number, CraftingFormula[]>;
    entries: CraftingEntriesSheetData;
    resources: {
        infusedReagents: {
            value: number;
            max: number;
        };
        versatileVials: {
            value: number;
            max: number;
        };
    };
}

type CharacterSheetTabVisibility = Record<typeof CHARACTER_SHEET_TABS[number], boolean>;

interface CharacterSheetData extends CreatureSheetData<CharacterPF2e> {
    abpEnabled: boolean;
    ancestry: Embedded<AncestryPF2e> | null;
    heritage: Embedded<HeritagePF2e> | null;
    background: Embedded<BackgroundPF2e> | null;
    adjustedBonusEncumbranceBulk: boolean;
    adjustedBonusLimitBulk: boolean;
    class: Embedded<ClassPF2e> | null;
    crafting: CraftingSheetData;
    data: CharacterSystemSheetData;
    deity: Embedded<DeityPF2e> | null;
    hasStamina: boolean;
    /** This actor has actual containers for stowing, rather than just containers serving as a UI convenience */
    hasRealContainers: boolean;
    magicTraditions: Record<MagicTradition, string>;
    options: CharacterSheetOptions;
    preparationType: Object;
    showPFSTab: boolean;
    spellcastingEntries: SpellcastingSheetData[];
    tabVisibility: CharacterSheetTabVisibility;
    feats: FeatCategorySheetData[];
}

interface FeatCategorySheetData {
    id: string;
    label: string;
    feats: (SlottedFeat | BonusFeat)[];
    /** Will move to sheet data later */
    featFilter?: string | null;
}

export {
    CharacterSheetData,
    CharacterSheetTabVisibility,
    CraftingEntriesSheetData,
    FeatCategorySheetData,
    QuickCraftingOptionsSheetData,
};
