import { ItemSheetPF2e } from "../sheet/base";
import { PhysicalItemPF2e } from "@item/physical";
import { ItemSheetDataPF2e } from "@item/sheet/data-types";

export class PhysicalItemSheetPF2e<TItem extends PhysicalItemPF2e = PhysicalItemPF2e> extends ItemSheetPF2e<TItem> {
    /** Show the identified data for editing purposes */
    override getData(): ItemSheetDataPF2e<TItem> {
        const sheetData: ItemSheetDataPF2e<TItem> = super.getData();

        // Set the source item data for editing
        const identifiedData = this.item.getMystifiedData("identified", { source: true });
        mergeObject(sheetData.item, identifiedData, { insertKeys: false, insertValues: false });

        return sheetData;
    }

    /** Normalize nullable fields to actual `null`s */
    protected override async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        const propertyPaths = [
            "data.baseItem",
            "data.preciousMaterial.value",
            "data.preciousMaterialGrade.value",
            "data.group.value",
        ];
        for (const path of propertyPaths) {
            if (formData[path] === "") formData[path] = null;
        }

        super._updateObject(event, formData);
    }
}
