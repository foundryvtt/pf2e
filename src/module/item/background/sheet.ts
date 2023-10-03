import { ABCSheetData, ABCSheetPF2e } from "../abc/sheet.ts";
import { BackgroundPF2e } from "./document.ts";
import { createSheetOptions, SheetOptions } from "@module/sheet/helpers.ts";

export class BackgroundSheetPF2e extends ABCSheetPF2e<BackgroundPF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<BackgroundSheetData> {
        const data = await super.getData(options);
        const itemData = data.item;

        return {
            ...data,
            trainedSkills: createSheetOptions(CONFIG.PF2E.skills, itemData.system.trainedSkills),
            selectedBoosts: Object.fromEntries(
                Object.entries(itemData.system.boosts).map(([k, b]) => [k, this.getLocalizedAbilities(b)])
            ),
        };
    }
}

interface BackgroundSheetData extends ABCSheetData<BackgroundPF2e> {
    trainedSkills: SheetOptions;
    selectedBoosts: Record<string, Record<string, string>>;
}
