import { ItemSheetDataPF2e, ItemSheetPF2e } from './base';
import { PhysicalItemPF2e } from '@item/physical';
import { isInventoryItem, PhysicalItemData } from '@item/data-definitions';

export interface PhysicalSheetDataPF2e<D extends PhysicalItemData> extends ItemSheetData<D> {
    isIdentified: boolean;
}

class MystifyData {
    name?: string;
    img?: string;
    data?: {
        description?: {
            value: string;
        };
    };
}

class ItemUpdateData {
    identification?: {
        identified?: MystifyData;
        unidentified?: MystifyData;
        misidentified?: MystifyData;
    };

    description?: {
        value: string;
    };

    rules?: string[];
}

export class PhysicalItemSheetPF2e<I extends PhysicalItemPF2e = PhysicalItemPF2e> extends ItemSheetPF2e<I> {
    /** @override */
    getData(): ItemSheetDataPF2e<I['data']> {
        const sheetdata = {
            ...super.getData(),
            isPhysicalItem: true,
            hasMystify: game.user.isGM && isInventoryItem(this.item.type) && BUILD_MODE === 'development',
            isIdentified: this.item.isIdentified,
        };
        return sheetdata;
    }

    /** @override */
    protected async _updateObject(event: Event, formData: Record<string, unknown>): Promise<void> {
        // Toggle item identification status
        if ('identified' in formData && formData['identified'] !== this.item.isIdentified) {
            formData['data.identification.status'] = formData['identified'] ? 'identified' : 'unidentified';
        }
        if (this.item.data.data.identification) {
            this.checkForMystifyUpdates(formData);
        }
        super._updateObject(event, formData);
    }

    private checkForMystifyUpdates(
        data: Record<string, unknown> & { name?: string; img?: string; data?: ItemUpdateData },
    ): void {
        let currentItemData: MystifyData;
        const namePath = `data.identification.${this.item.data.data.identification.status}.name`;
        const imgPath = `data.identification.${this.item.data.data.identification.status}.img`;
        const mystifyDescPath = `data.identification.${this.item.data.data.identification.status}.data.description.value`;
        const baseDescPath = `data.description.value`;
        switch (this.item.data.data.identification.status) {
            case 'unidentified': {
                currentItemData = this.item.data.data.identification.unidentified ?? new MystifyData();
                break;
            }
            case 'misidentified': {
                currentItemData = this.item.data.data.identification.misidentified ?? new MystifyData();
                break;
            }
            case 'identified':
            default: {
                currentItemData = this.item.data.data.identification.identified ?? new MystifyData();
                break;
            }
        }

        // Determine if the base values changed.
        if (this.item.data.name !== data.name) {
            data[namePath] = data.name;
        } else if (data[namePath] !== currentItemData.name) {
            data.name = data[namePath] as string;
        }

        if (this.item.data.img !== data.img) {
            data[imgPath] = data.img;
        } else if (data[imgPath] !== currentItemData.img) {
            data.img = data[imgPath] as string;
        }

        if (mystifyDescPath in data) {
            data[baseDescPath] = data[mystifyDescPath];
        } else if (baseDescPath in data) {
            data[mystifyDescPath] = data[baseDescPath];
        }
    }
}
