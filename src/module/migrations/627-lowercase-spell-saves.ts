import { ItemDataPF2e } from '@item/data-definitions';
import { tupleHasValue } from '@module/utils';
import { MigrationBase } from './base';

const AllSaves = ['fortitude', 'reflex', 'will'] as const;

export class Migration627LowerCaseSpellSaves extends MigrationBase {
    static version = 0.627;

    async updateItem(itemData: ItemDataPF2e) {
        if (itemData.type !== 'spell') return;
        const saveType = itemData.data.save.value?.toLowerCase() ?? '';
        if (tupleHasValue(AllSaves, saveType)) {
            itemData.data.save.value = saveType;
        } else {
            itemData.data.save.value = '';
        }
    }
}
