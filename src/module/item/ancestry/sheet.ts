import { AncestryPF2e } from "@item/ancestry/index.ts";
import { ABCSheetData, ABCSheetPF2e } from "@item/abc/sheet.ts";
import { createSheetOptions, SheetOptions } from "@module/sheet/helpers.ts";

class AncestrySheetPF2e extends ABCSheetPF2e<AncestryPF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<AncestrySheetData> {
        const data: ABCSheetData<AncestryPF2e> = await super.getData(options);
        const itemData = data.item;

        return {
            ...data,
            selectedBoosts: Object.fromEntries(
                Object.entries(itemData.system.boosts).map(([k, b]) => [k, this.getLocalizedAbilities(b)])
            ),
            selectedFlaws: Object.fromEntries(
                Object.entries(itemData.system.flaws).map(([k, b]) => [k, this.getLocalizedAbilities(b)])
            ),
            sizes: createSheetOptions(CONFIG.PF2E.actorSizes, { value: [itemData.system.size] }),
            languages: createSheetOptions(CONFIG.PF2E.languages, itemData.system.languages),
            additionalLanguages: createSheetOptions(CONFIG.PF2E.languages, itemData.system.additionalLanguages),
        };
    }
}

interface AncestrySheetData extends ABCSheetData<AncestryPF2e> {
    selectedBoosts: Record<string, Record<string, string>>;
    selectedFlaws: Record<string, Record<string, string>>;
    sizes: SheetOptions;
    languages: SheetOptions;
    additionalLanguages: SheetOptions;
}

export { AncestrySheetPF2e };
