import { ItemSheetOptions } from "@item/base/sheet/sheet.ts";
import { SheetOptions, createSheetOptions } from "@module/sheet/helpers.ts";
import { ABCSheetData, ABCSheetPF2e } from "../abc/sheet.ts";
import type { BackgroundPF2e } from "./document.ts";

export class BackgroundSheetPF2e extends ABCSheetPF2e<BackgroundPF2e> {
    override async getData(options?: Partial<ItemSheetOptions>): Promise<BackgroundSheetData> {
        const data = await super.getData(options);
        const itemData = data.item;

        return {
            ...data,
            trainedSkills: createSheetOptions(CONFIG.PF2E.skillList, itemData.system.trainedSkills),
            selectedBoosts: Object.fromEntries(
                Object.entries(itemData.system.boosts).map(([k, b]) => [k, this.getLocalizedAbilities(b)]),
            ),
        };
    }
}

interface BackgroundSheetData extends ABCSheetData<BackgroundPF2e> {
    trainedSkills: SheetOptions;
    selectedBoosts: Record<string, Record<string, string>>;
}
