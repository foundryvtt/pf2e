import { FormulaPF2e, ItemPF2e } from "@item";
import { ItemSheetPF2e } from "@item/sheet/base";
import { ItemSheetDataPF2e } from "@item/sheet/data-types";

export class FormulaSheetPF2e extends ItemSheetPF2e<FormulaPF2e> {
    override getData() {
        const data: ItemSheetDataPF2e<FormulaPF2e> = super.getData();
        (async () => await this.updateData(data))();
        return { ...data };
    }

    async updateData(data: ItemSheetDataPF2e<FormulaPF2e>) {
        const item = (await fromUuid(data.item.data.craftedItem.uuid)) as ItemPF2e;
        if (item) {
            data.item.img = item.img;
            data.item.name = `Formula of ${item.name}`;
            data.item.data.description.value = item.description;
        }
    }
}
