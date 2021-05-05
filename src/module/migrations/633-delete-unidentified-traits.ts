import { IdentificationData, isPhysicalItem, ItemDataPF2e, MeleeDetailsData, MystifiedData } from '@item/data/types';
import { MigrationBase } from './base';

type ItemDataWithIdentification = ItemDataPF2e & {
    'data.-=identification'?: null;
    'data.identification.unidentified.data.-=traits'?: null;
};

interface MeleeWithIdentification extends MeleeDetailsData {
    identification?: IdentificationData;
}

type UnidentifiedWithTraits = MystifiedData['data'] & {
    traits?: unknown;
};

/** OK, let's not store mystified traits. */
export class Migration633DeleteUnidentifiedTraits extends MigrationBase {
    static version = 0.633;

    async updateItem(itemData: ItemDataWithIdentification): Promise<void> {
        // This definitely shouldn't be here
        if (itemData.type === 'melee') {
            const systemData: MeleeWithIdentification = itemData.data;
            if (systemData.identification) {
                if ('game' in globalThis) {
                    itemData['data.-=identification'] = null;
                } else {
                    delete systemData.identification;
                }
            }
        }

        if (!isPhysicalItem(itemData)) return;

        const unidentifiedDataData: UnidentifiedWithTraits = itemData.data.identification?.unidentified?.data;
        if (unidentifiedDataData?.traits) {
            if ('game' in globalThis) {
                itemData['data.identification.unidentified.data.-=traits'] = null;
            } else {
                delete unidentifiedDataData.traits;
            }
        }
    }
}
