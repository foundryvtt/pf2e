import { ItemSourcePF2e } from '@item/data';
import { MigrationBase } from '../base';

/** Fix precious material value of "sovereign steel" */
export class Migration641SovereignSteelValue extends MigrationBase {
    static override version = 0.641;

    override async updateItem(itemSource: ItemSourcePF2e): Promise<void> {
        if (itemSource.type !== 'weapon') return;
        if (itemSource.data.preciousMaterial.value?.toLowerCase() === 'sovereign steel') {
            itemSource.data.preciousMaterial.value = 'sovereignSteel';
        }
    }
}
