import { ItemPF2e, PhysicalItemPF2e } from "@item";
import { AncestryPF2e } from "@item/ancestry";
import { FeatPF2e } from "@item/feat";
import { HeritagePF2e } from "@item/heritage";
import { ItemActivation } from "@item/physical/data";
import { MaterialGradeData } from "@item/physical/materials";
import { PreciousMaterialGrade } from "@item/physical/types";
import { Rarity } from "@module/data";
import { RuleElementSource } from "@module/rules";
import { SheetOptions } from "@module/sheet/helpers";

export interface ItemSheetDataPF2e<TItem extends ItemPF2e> extends ItemSheetData<TItem> {
    /** The item type label that shows at the top right (for example, "Feat" for "Feat 6") */
    itemType: string | null;
    showTraits: boolean;
    /** Whether the sheet should have a sidebar at all */
    hasSidebar: boolean;
    /** Whether the sheet should have a details tab (some item types don't have one) */
    hasDetails: boolean;
    /** The sidebar's current title */
    sidebarTitle: string;
    sidebarTemplate?: () => string;
    detailsTemplate?: () => string;
    item: TItem["data"];
    data: TItem["data"]["system"];
    enrichedContent: Record<string, string>;
    isPhysical: boolean;
    user: { isGM: boolean };
    enabledRulesUI: boolean;
    ruleEditing: boolean;
    rarity: Rarity | null;
    rarities: ConfigPF2e["PF2E"]["rarityTraits"];
    traits: SheetOptions | null;
    /** The slugs of the item's value sorted trait list */
    traitSlugs: string[];
    rules: {
        labels: {
            label: string;
            recognized: boolean;
        }[];
        selection: {
            selected: string | null;
            types: Record<string, string>;
        };
        elements: {
            template: string;
            index: number;
            rule: RuleElementSource;
        }[];
    };
    /** Lore only, will be removed later */
    proficiencies: ConfigPF2e["PF2E"]["proficiencyLevels"];
}

export interface PhysicalItemSheetData<TItem extends PhysicalItemPF2e> extends ItemSheetDataPF2e<TItem> {
    isPhysical: true;
    basePriceString: string;
    priceString: string;
    actionTypes: ConfigPF2e["PF2E"]["actionTypes"];
    actionsNumber: ConfigPF2e["PF2E"]["actionsNumber"];
    bulkTypes: ConfigPF2e["PF2E"]["bulkTypes"];
    frequencies: ConfigPF2e["PF2E"]["frequencies"];
    sizes: ConfigPF2e["PF2E"]["actorSizes"];
    stackGroups: ConfigPF2e["PF2E"]["stackGroups"];
    usage: ConfigPF2e["PF2E"]["usageTraits"];
    bulkDisabled: boolean;
    activations: { action: ItemActivation; id: string; base: string }[];
}

export interface FeatSheetData extends ItemSheetDataPF2e<FeatPF2e> {
    featTypes: ConfigPF2e["PF2E"]["featTypes"];
    actionTypes: ConfigPF2e["PF2E"]["actionTypes"];
    actionsNumber: ConfigPF2e["PF2E"]["actionsNumber"];
    frequencies: ConfigPF2e["PF2E"]["frequencies"];
    damageTypes: ConfigPF2e["PF2E"]["damageTypes"] & ConfigPF2e["PF2E"]["healingTypes"];
    categories: ConfigPF2e["PF2E"]["actionCategories"];
    prerequisites: string;
    isFeat: boolean;
    mandatoryTakeOnce: boolean;
    hasLineageTrait: boolean;
}

export interface HeritageSheetData extends ItemSheetDataPF2e<HeritagePF2e> {
    ancestry: AncestryPF2e | null;
    ancestryRefBroken: boolean;
}

type MaterialSheetEntry = {
    label: string;
    grades: Partial<Record<PreciousMaterialGrade, MaterialGradeData>>;
};

export type MaterialSheetData = {
    value: string;
    materials: Record<string, MaterialSheetEntry>;
};
