import { FormulaPF2e, ItemPF2e } from "@item";
import { ItemSheetPF2e } from "@item/sheet/base";
import { ItemSheetDataPF2e } from "@item/sheet/data-types";

export class FormulaSheetPF2e extends ItemSheetPF2e<FormulaPF2e> {
    override getData() {
        const data: ItemSheetDataPF2e<FormulaPF2e> = super.getData();
        if (data.item.data.craftedItem.uuid) {
            return fromUuid(data.item.data.craftedItem.uuid).then(
                (compendiumItem) => {
                    if (compendiumItem) {
                        const item = compendiumItem as ItemPF2e;
                        data.item.img = item.img;
                        data.item.name = `Formula of ${item.name}`;
                        data.item.data.description.value = item.description;
                    }
                    return { ...data };
                },
                () => {
                    data.item.img = "systems/pf2e/icons/default-icons/lore.svg";
                    data.item.name = "Unknown Formula";
                    data.item.data.description.value =
                        "This formula is completely filled with drawings of small\
                        stick men, stains from some unknown liquid, non-sensical\
                        rhymes written in children's letters, and other seemingly\
                        random markings. It must have been made by goblins, and\
                        makes no sense to you.<hr><b>Note:</b> This formula is\
                            referencing a missing or invalid item.";
                    return { ...data };
                }
            );
        } else {
            data.item.img = "systems/pf2e/icons/default-icons/lore.svg";
            data.item.name = "Empty Formula";
            data.item.data.description.value = "";
            return { ...data };
        }
    }
}
