import { PhysicalItemSheetData, PhysicalItemSheetPF2e } from "@item/physical";
import { TreasurePF2e } from ".";

export class TreasureSheetPF2e extends PhysicalItemSheetPF2e<TreasurePF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<TreasureSheetData> {
        return {
            ...(await super.getData(options)),
            hasDetails: false,
            hasSidebar: true,
            currencies: CONFIG.PF2E.currencies,
        };
    }
}

interface TreasureSheetData extends PhysicalItemSheetData<TreasurePF2e> {
    currencies: ConfigPF2e["PF2E"]["currencies"];
}
