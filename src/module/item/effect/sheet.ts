import { ItemSheetDataPF2e } from "@item/sheet/data-types";
import { EffectPF2e } from ".";
import { ItemSheetPF2e } from "../sheet/base";

export class EffectSheetPF2e extends ItemSheetPF2e<EffectPF2e> {
    override async getData(options?: Partial<DocumentSheetOptions>): Promise<ItemSheetDataPF2e<EffectPF2e>> {
        return {
            ...this.getBaseData(options),
            hasSidebar: true,
            hasDetails: false,
        };
    }
}
