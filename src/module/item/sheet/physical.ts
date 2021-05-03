import { ItemSheetDataPF2e, ItemSheetPF2e } from './base';
import { PhysicalItemPF2e } from '@item/physical';

export class PhysicalItemSheetPF2e<I extends PhysicalItemPF2e = PhysicalItemPF2e> extends ItemSheetPF2e<I> {
    /** @override */
    getData(): ItemSheetDataPF2e<I['data']> {
        const sheetData: ItemSheetDataPF2e<I['data']> = super.getData();
        sheetData.item.name = sheetData.item.realName;
        sheetData.item.img = sheetData.item.realImg;
        sheetData.item.data.description.value = sheetData.item.realDescription;

        return {
            ...sheetData,
            isPhysicalItem: this.item.type !== 'melee',
        };
    }

    /** @override */
    protected async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // Change the update target to the source description
        if ('realDescription' in formData) {
            formData['data.description.value'] = formData['realDescription'];
            delete formData['realDescription'];
        }

        // Normalize other nullable fields to actual `null`s
        if (formData['data.group.value'] === '') {
            formData['data.group.value'] = null;
        }

        super._updateObject(event, formData);
    }
}
