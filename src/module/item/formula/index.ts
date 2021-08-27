import { adjustDCByRarity, calculateDC } from "@module/dc";
import { ItemPF2e, PhysicalItemPF2e } from "../index";
import { CraftedItem, FormulaData } from "./data";

export class FormulaPF2e extends ItemPF2e {
    static override get schema(): typeof FormulaData {
        return FormulaData;
    }

    async updateData() {
        const craftedItemData = await this.getCraftedItemData();
        const craftedItem = craftedItemData.craftedItem;
        this.data.data.craftedItem = craftedItem;
        this.data.img = craftedItem.img;
        this.data.name = craftedItemData.validFormula
            ? game.i18n.format("PF2E.FormulaSheet.NamePrefix", { name: craftedItem.name })
            : craftedItem.name;
        this.data.data.description.value = craftedItem.description;

        await this.update(this.toObject(false), { diff: true });
    }

    async getCraftedItemData() {
        const craftedItem: CraftedItem = {
            dc: null,
            description: "",
            img: "systems/pf2e/icons/default-icons/lore.svg",
            level: 0,
            name: game.i18n.localize("PF2E.FormulaSheet.NameEmpty"),
            price: "",
            uuid: this.data.data.craftedItem.uuid,
        };
        let validFormula = false;
        try {
            const item = await fromUuid(this.data.data.craftedItem.uuid);
            if (item instanceof PhysicalItemPF2e) {
                craftedItem.dc = adjustDCByRarity(calculateDC(item.level), item.rarity);
                craftedItem.description = item.description;
                craftedItem.img = item.img;
                craftedItem.level = item.level;
                craftedItem.name = item.name;
                craftedItem.price = item.price;
                validFormula = true;
            }
        } catch {
            if (this.data.data.craftedItem.uuid) {
                craftedItem.name = game.i18n.localize("PF2E.FormulaSheet.NameUnknown");
                craftedItem.description = game.i18n.localize("PF2E.FormulaSheet.DescriptionUnknown");
            }
        }
        return { craftedItem: craftedItem, validFormula: validFormula };
    }
}

export interface FormulaPF2e {
    readonly data: FormulaData;
}
