import { ItemSourcePF2e } from '@item/data';
import { isPhysicalData } from '@item/data/helpers';
import { coinValueInCopper, extractPriceFromItem } from '@item/treasure/helpers';
import { MigrationBase } from '../base';

/** Normalize stringy level and price values */
export class Migration639NormalizeLevelAndPrice extends MigrationBase {
    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if ('level' in itemData.data) {
            itemData.data.level.value = Number(itemData.data.level.value) || 0;
        }

        if (!isPhysicalData(itemData) || (itemData.type === 'treasure' && itemData.data.stackGroup.value === 'coins')) {
            return;
        }
        const price = itemData.data.price;
        try {
            price.value = price.value.trim();
        } catch {
            price.value = '0 gp';
        }
        if (/^[0-9]+$/.test(price.value)) {
            price.value = `${price.value} gp`;
        } else if (coinValueInCopper(extractPriceFromItem(itemData)) === 0) {
            price.value = '0 gp';
        }
    }
}
