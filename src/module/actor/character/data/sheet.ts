import { CharacterPF2e } from "@actor";
import { CraftingEntry } from "@actor/character/crafting/entry.ts";
import { CraftingFormula } from "@actor/character/crafting/formula.ts";
import { CreatureSheetData } from "@actor/creature/types.ts";
import { SaveType } from "@actor/types.ts";
import { AncestryPF2e, BackgroundPF2e, ClassPF2e, DeityPF2e, HeritagePF2e } from "@item";
import { MagicTradition } from "@item/spell/index.ts";
import { SpellcastingSheetData } from "@item/spellcasting-entry/index.ts";
import { FlattenedCondition } from "@system/conditions/index.ts";
import { CHARACTER_SHEET_TABS } from "../values.ts";
import { CharacterSaveData, CharacterSystemData, ClassDCData } from "./types.ts";
import { FeatGroup } from "../feats.ts";

type CharacterSheetOptions = ActorSheetOptions;

type CharacterSystemSheetData = CharacterSystemData & {
    attributes: {
        perception: {
            rankName: string;
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
    saves: Record<
        SaveType,
        CharacterSaveData & {
            rankName?: string;
            short?: string;
        }
    >;
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

type CharacterSheetTabVisibility = Record<(typeof CHARACTER_SHEET_TABS)[number], boolean>;

interface CharacterSheetData<TActor extends CharacterPF2e> extends CreatureSheetData<TActor> {
    abpEnabled: boolean;
    ancestry: AncestryPF2e<CharacterPF2e> | null;
    heritage: HeritagePF2e<CharacterPF2e> | null;
    background: BackgroundPF2e<CharacterPF2e> | null;
    adjustedBonusEncumbranceBulk: boolean;
    adjustedBonusLimitBulk: boolean;
    class: ClassPF2e<CharacterPF2e> | null;
    classDCs: {
        dcs: ClassDCSheetData[];
        /** The slug of the character's primary class DC */
        primary: string | null;
        /** Show class label and individual modifier lists for each class DC */
        perDCDetails: boolean;
    };
    crafting: CraftingSheetData;
    data: CharacterSystemSheetData;
    deity: DeityPF2e<CharacterPF2e> | null;
    hasStamina: boolean;
    /** This actor has actual containers for stowing, rather than just containers serving as a UI convenience */
    hasRealContainers: boolean;
    magicTraditions: Record<MagicTradition, string>;
    options: CharacterSheetOptions;
    preparationType: Object;
    showPFSTab: boolean;
    spellcastingEntries: SpellcastingSheetData[];
    tabVisibility: CharacterSheetTabVisibility;
    feats: FeatGroup[];
}

interface ClassDCSheetData extends ClassDCData {
    icon: string;
    hover: string;
    rankSlug: string;
    rankName: string;
}

export { CharacterSheetData, CharacterSheetTabVisibility, ClassDCSheetData };
