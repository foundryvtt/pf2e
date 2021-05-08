import { ItemSheetDataPF2e, ItemSheetPF2e } from './base';
import { PhysicalItemPF2e } from '@item/physical';

export class PhysicalItemSheetPF2e<I extends PhysicalItemPF2e = PhysicalItemPF2e> extends ItemSheetPF2e<I> {
    /**
     * Show the identified data for editing purposes
     * @override
     */
    getData(): ItemSheetDataPF2e<I['data']> {
        const sheetData: ItemSheetDataPF2e<I['data']> = super.getData();
        // Set defaults for unidentified data
        sheetData.data.identification.unidentified = this.item.getMystifiedData('unidentified');

        // Set the source item data for editing
        if (!sheetData.item.isIdentified) {
            mergeObject(sheetData.item, this.item.getMystifiedData('identified'), { inplace: true, insertKeys: false });
        }

        return sheetData;
    }

    /** @override */
    protected async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // Change the update target to the source description
        if ('identifiedData.data.description.value' in formData) {
            formData['data.description.value'] = formData['identifiedData.data.description.value'];
            delete formData['identifiedData.data.description.value'];
        }

        // Normalize other nullable fields to actual `null`s
        if (formData['data.group.value'] === '') {
            formData['data.group.value'] = null;
        }

        super._updateObject(event, formData);
    }
}
