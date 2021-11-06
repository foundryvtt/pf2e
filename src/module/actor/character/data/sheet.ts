import { CharacterPF2e } from "@actor";
import { CreatureTraitsData } from "@actor/creature/data";
import { CreatureSensePF2e } from "@actor/creature/sense";
import { SpellcastingSheetData } from "@actor/npc/sheet";
import { ActorSheetDataPF2e } from "@actor/sheet/data-types";
import { AncestryPF2e, BackgroundPF2e, ClassPF2e } from "@item";
import { MagicTradition } from "@item/spellcasting-entry/data";
import { CraftingFormula } from "@module/crafting/formula";
import { FlattenedCondition } from "@system/conditions";
import { CharacterAttributes, CharacterSystemData } from ".";

interface CharacterSenses extends CreatureSensePF2e {
    localizedName?: string;
    localizedAcuity?: string;
}

interface CharacterSheetOptions extends ActorSheetOptions {
    showUnpreparedSpells: boolean;
}

interface CharacterSystemSheetData extends CharacterSystemData {
    attributes: CharacterAttributes & {
        doomed: {
            icon: string;
        };
        dying: {
            icon: string;
        };
        heroPoints: {
            icon: string;
            hover: string;
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
    traits: CreatureTraitsData & {
        senses: CharacterSenses[];
        size: {
            localizedName?: string;
        };
    };
}

interface CraftingData {
    noCost: boolean;
    knownFormulas: Record<number, CraftingFormula[]>;
}

/** Additional fields added in sheet data preparation */
export interface CharacterSheetData extends ActorSheetDataPF2e<CharacterPF2e> {
    abpEnabled: boolean;
    //actor:
    ancestry: Embedded<AncestryPF2e> | null;
    background: Embedded<BackgroundPF2e> | null;
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
}
