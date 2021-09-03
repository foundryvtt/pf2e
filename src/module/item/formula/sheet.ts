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
        if (data.item.data.craftedItem.uuid) {
            try {
                const compendiumItem = await fromUuid(data.item.data.craftedItem.uuid);
                if (compendiumItem) {
                    const item = compendiumItem as ItemPF2e;
                    data.item.img = item.img;
                    data.item.name = game.i18n.format("PF2E.FormulaSheet.NamePrefix", { name: item.name });
                    data.item.data.description.value = item.description;
                }
            } catch {
                data.item.img = "systems/pf2e/icons/default-icons/lore.svg";
                data.item.name = game.i18n.localize("PF2E.FormulaSheet.NameUnknown");
                data.item.data.description.value = game.i18n.localize("PF2E.FormulaSheet.DescriptionUnknown");
            }
        } else {
            data.item.img = "systems/pf2e/icons/default-icons/lore.svg";
            data.item.name = game.i18n.localize("PF2E.FormulaSheet.NameEmpty");
            data.item.data.description.value = "";
        }
    }
}
