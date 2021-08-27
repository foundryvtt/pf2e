import { FormulaPF2e } from "@item";
import { ItemSheetPF2e } from "@item/sheet/base";
import { ItemSheetDataPF2e } from "@item/sheet/data-types";

export class FormulaSheetPF2e extends ItemSheetPF2e<FormulaPF2e> {
    override getData() {
        (async () => await this.item.updateData())();
        const data: ItemSheetDataPF2e<FormulaPF2e> = super.getData();
        return { ...data };
    }
}
