import { ItemSourcePF2e } from '@item/data';
import { isPhysicalData } from '@item/data/helpers';
import { MeleeSystemData } from '@item/melee/data';
import { IdentificationData, MystifiedData } from '@item/physical/data';
import { MigrationBase } from '../base';

type ItemDataWithIdentification = ItemSourcePF2e & {
    'data.-=identification'?: null;
    'data.identification.unidentified.data.-=traits'?: null;
};

interface MeleeWithIdentification extends MeleeSystemData {
    identification?: IdentificationData;
}

type UnidentifiedWithTraits = MystifiedData['data'] & {
    traits?: unknown;
};

/** OK, let's not store mystified traits. */
export class Migration633DeleteUnidentifiedTraits extends MigrationBase {
    static override version = 0.633;

    override async updateItem(itemData: ItemDataWithIdentification): Promise<void> {
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

        if (!isPhysicalData(itemData)) return;

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
