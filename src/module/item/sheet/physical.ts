import { ItemSheetDataPF2e, ItemSheetPF2e } from './base';
import { PhysicalItemPF2e } from '@item/physical';
import { PhysicalItemData } from '@item/data-definitions';

export interface PhysicalSheetDataPF2e<D extends PhysicalItemData> extends ItemSheetData<D> {
    isIdentified: boolean;
}

export class PhysicalItemSheetPF2e<I extends PhysicalItemPF2e = PhysicalItemPF2e> extends ItemSheetPF2e<I> {
    /** @override */
    getData(): ItemSheetDataPF2e<I['data']> {
        return {
            ...super.getData(),
            isPhysicalItem: true,
            isIdentified: this.item.isIdentified,
        };
    }

    /** @override */
    protected async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // Toggle item identification status
        if (formData['identified'] !== this.item.isIdentified) {
            formData['data.identification.status'] = formData['identified'] ? 'identified' : 'unidentified';
        }
        super._updateObject(event, formData);
    }
}
