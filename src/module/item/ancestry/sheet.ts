import { ABCSheetData, ABCSheetPF2e } from "@item/abc/sheet.ts";
import type { AncestryPF2e } from "@item/ancestry/index.ts";
import { ItemSheetOptions } from "@item/base/sheet/sheet.ts";
import { SheetOptions, createSheetOptions, createSheetTags } from "@module/sheet/helpers.ts";

class AncestrySheetPF2e extends ABCSheetPF2e<AncestryPF2e> {
    static override get defaultOptions(): ItemSheetOptions {
        return { ...super.defaultOptions, hasSidebar: true };
    }

    override async getData(options?: Partial<ItemSheetOptions>): Promise<AncestrySheetData> {
        const sheetData = await super.getData(options);
        const itemData = sheetData.item;

        return {
            ...sheetData,
            selectedBoosts: Object.fromEntries(
                Object.entries(itemData.system.boosts).map(([k, b]) => [k, this.getLocalizedAbilities(b)]),
            ),
            selectedFlaws: Object.fromEntries(
                Object.entries(itemData.system.flaws).map(([k, b]) => [k, this.getLocalizedAbilities(b)]),
            ),
            sizes: createSheetOptions(CONFIG.PF2E.actorSizes, { value: [itemData.system.size] }),
            languages: createSheetTags(CONFIG.PF2E.languages, itemData.system.languages),
            additionalLanguages: createSheetTags(CONFIG.PF2E.languages, itemData.system.additionalLanguages),
            visionTypeOptions: [
                { value: "normal", label: "PF2E.Item.Ancestry.Vision.Normal" },
                { value: "low-light-vision", label: "PF2E.Actor.Creature.Sense.Type.LowLightVision" },
                { value: "darkvision", label: "PF2E.Actor.Creature.Sense.Type.Darkvision" },
            ],
        };
    }
}

interface AncestrySheetData extends ABCSheetData<AncestryPF2e> {
    selectedBoosts: Record<string, Record<string, string>>;
    selectedFlaws: Record<string, Record<string, string>>;
    sizes: SheetOptions;
    languages: SheetOptions;
    additionalLanguages: SheetOptions;
    visionTypeOptions: FormSelectOption[];
}

export { AncestrySheetPF2e };
