import { ItemSheetDataPF2e, ItemSheetPF2e } from './base';
import { PhysicalItemPF2e } from '@item/physical';

export class PhysicalItemSheetPF2e<TItem extends PhysicalItemPF2e = PhysicalItemPF2e> extends ItemSheetPF2e<TItem> {
    /**
     * Show the identified data for editing purposes
     * @override
     */
    getData(): ItemSheetDataPF2e<TItem> {
        const sheetData: ItemSheetDataPF2e<TItem> = super.getData();

        // Set the source item data for editing
        if (!sheetData.item.isIdentified) {
            const identifiedData = this.item.getMystifiedData('identified');
            mergeObject(sheetData.item, identifiedData, { insertKeys: false, insertValues: false });
        }

        return sheetData;
    }

    /** @override */
    protected async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // Normalize nullable fields to actual `null`s
        for (const propertyPath of ['data.baseItem', 'data.group.value']) {
            if (formData[propertyPath] === '') formData[propertyPath] = null;
        }

        super._updateObject(event, formData);
    }
}
