import { FeatPF2e } from "@item/feat";
import { FeatSheetData, ItemSheetDataPF2e } from "../sheet/data-types";
import { ItemSheetPF2e } from "../sheet/base";

export class FeatSheetPF2e extends ItemSheetPF2e<FeatPF2e> {
    override getData(): FeatSheetData {
        const data: ItemSheetDataPF2e<FeatPF2e> = super.getData();
        return {
            ...data,
            featTypes: CONFIG.PF2E.featTypes,
            actionTypes: CONFIG.PF2E.actionTypes,
            actionsNumber: CONFIG.PF2E.actionsNumber,
            frequencies: CONFIG.PF2E.frequencies,
            categories: CONFIG.PF2E.actionCategories,
            damageTypes: { ...CONFIG.PF2E.damageTypes, ...CONFIG.PF2E.healingTypes },
            prerequisites: JSON.stringify(this.item.data.data.prerequisites?.value ?? []),
            rarities: this.prepareOptions(CONFIG.PF2E.rarityTraits, { value: [data.data.traits.rarity.value] }),
            traits: this.prepareOptions(CONFIG.PF2E.featTraits, data.data.traits),
        };
    }

    activateListeners($html: JQuery<HTMLElement>): void {
        super.activateListeners($html);

        $html.find(".toggle-frequency").on("change", (evt) => {
            evt.stopPropagation();
            evt.preventDefault();
            const target = evt.target as HTMLInputElement;
            if (target.checked) {
                this.item.update({ "data.frequency": { max: 1, per: "day" } });
            } else {
                this.item.update({ "data.-=frequency": null });
            }
        });
    }
}
