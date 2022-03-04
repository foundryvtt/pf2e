import { CharacterPF2e } from "@actor";
import { SpellcastingSheetData } from "@actor/npc/sheet";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types";
import { AncestryPF2e, BackgroundPF2e, ClassPF2e, HeritagePF2e } from "@item";
import { MagicTradition } from "@item/spellcasting-entry/data";
import { CraftingEntry } from "@actor/character/crafting/entry";
import { CraftingFormula } from "@actor/character/crafting/formula";
import { FlattenedCondition } from "@system/conditions";
import { CharacterSystemData } from ".";
import { CharacterSheetTabVisibility } from "./types";

interface CharacterSheetOptions extends ActorSheetOptions {
    showUnpreparedSpells: boolean;
}

type CharacterSystemSheetData = CharacterSystemData & {
    attributes: {
        doomed: {
            icon: string;
        };
        dying: {
            icon: string;
        };
        wounded: {
            icon: string;
        };
    };
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

export interface CraftingEntriesSheetData {
    dailyCrafting: boolean;
    other: CraftingEntry[];
    alchemical: {
        entries: CraftingEntry[];
        totalReagentCost: number;
        infusedReagents: {
            value: number;
            max: number;
        };
    };
}

interface CraftingSheetData {
    noCost: boolean;
    hasQuickAlchemy: boolean;
    knownFormulas: Record<number, CraftingFormula[]>;
    entries: CraftingEntriesSheetData;
}

/** Additional fields added in sheet data preparation */
export interface CharacterSheetData extends ActorSheetDataPF2e<CharacterPF2e> {
    abpEnabled: boolean;
    ancestry: Embedded<AncestryPF2e> | null;
    heritage: Embedded<HeritagePF2e> | null;
    background: Embedded<BackgroundPF2e> | null;
    adjustedBonusEncumbranceBulk: boolean;
    adjustedBonusLimitBulk: boolean;
    class: Embedded<ClassPF2e> | null;
    crafting: CraftingSheetData;
    data: CharacterSystemSheetData;
    hasStamina: boolean;
    /** This actor has actual containers for stowing, rather than just containers serving as a UI convenience */
    hasRealContainers: boolean;
    magicTraditions: Record<MagicTradition, string>;
    options: CharacterSheetOptions;
    preparationType: Object;
    showPFSTab: boolean;
    showUnpreparedSpells: boolean;
    spellcastingEntries: SpellcastingSheetData[];
    tabVisibility: CharacterSheetTabVisibility;
}
