import { ItemSourcePF2e } from '@item/data';
import { ZeroToTen } from '@module/data';
import { MigrationBase } from '../base';

type LevelOld = { value?: ZeroToTen };

/** Cantrips are no longer 0th level spells */
export class Migration640CantripsAreNotZeroLevel extends MigrationBase {
    static override version = 0.64;
    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        // Recursively apply to embedded spells
        if (itemData.type === 'consumable' && itemData.data.spell.data) {
            return this.updateItem(itemData.data.spell.data);
        }

        if (itemData.type !== 'spell') return;

        const level: LevelOld = itemData.data.level;
        if (level.value === 0) {
            level.value = 1;
            if (!itemData.data.traits.value.includes('cantrip')) {
                itemData.data.traits.value.push('cantrip');
            }
        }
    }
}
