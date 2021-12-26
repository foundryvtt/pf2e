import { CharacterPF2e } from "@actor";
import { SpellcastingSheetData } from "@actor/npc/sheet";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types";
import { AncestryPF2e, BackgroundPF2e, ClassPF2e } from "@item";
import { MagicTradition } from "@item/spellcasting-entry/data";
import { CraftingEntry } from "@module/crafting/crafting-entry";
import { CraftingFormula } from "@module/crafting/formula";
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

interface CraftingEntries {
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

interface CraftingData {
    noCost: boolean;
    knownFormulas: Record<number, CraftingFormula[]>;
    entries: CraftingEntries;
}

/** Additional fields added in sheet data preparation */
export interface CharacterSheetData extends ActorSheetDataPF2e<CharacterPF2e> {
    abpEnabled: boolean;
    //actor:
    ancestry: Embedded<AncestryPF2e> | null;
    background: Embedded<BackgroundPF2e> | null;
    adjustedBonusEncumbranceBulk: boolean;
    adjustedBonusLimitBulk: boolean;
    class: Embedded<ClassPF2e> | null;
    crafting: CraftingData;
    data: CharacterSystemSheetData;
    hasStamina: boolean;
    //items:
    magicTraditions: Record<MagicTradition, string>;
    options: CharacterSheetOptions;
    preparationType: Object;
    showPFSTab: boolean;
    showUnpreparedSpells: boolean;
    spellcastingEntries: SpellcastingSheetData[];
    tabVisibility: CharacterSheetTabVisibility;
}
