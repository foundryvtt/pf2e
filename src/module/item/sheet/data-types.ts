import { ItemPF2e } from "@item";
import { Rarity } from "@module/data.ts";
import { RuleElementSource } from "@module/rules/index.ts";
import { SheetOptions, TraitTagifyEntry } from "@module/sheet/helpers.ts";

interface ItemSheetDataPF2e<TItem extends ItemPF2e> extends ItemSheetData<TItem> {
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
    item: TItem;
    data: TItem["system"];
    enrichedContent: Record<string, string>;
    isPhysical: boolean;
    user: { isGM: boolean };
    enabledRulesUI: boolean;
    ruleEditing: boolean;
    rarity: Rarity | null;
    rarities: ConfigPF2e["PF2E"]["rarityTraits"];
    traits: SheetOptions | null;
    traitTagifyData: TraitTagifyEntry[] | null;
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

export { ItemSheetDataPF2e };
