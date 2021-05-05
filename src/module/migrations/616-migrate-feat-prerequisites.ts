import { ItemDataPF2e } from '@item/data/types';
import { MigrationBase } from './base';

export class Migration616MigrateFeatPrerequisites extends MigrationBase {
    static version = 0.616;

    async updateItem(itemData: ItemDataPF2e) {
        if (itemData.type === 'feat') {
            const update = [];
            const prerequisites: any = itemData.data.prerequisites;
            if (prerequisites.value) {
                if (typeof prerequisites.value === 'string') {
                    update.push({ value: prerequisites.value });
                } else if (Array.isArray(prerequisites.value)) {
                    for (const p of prerequisites.value) {
                        if (p) {
                            update.push({
                                value: p?.value ? p.value : p,
                            });
                        }
                    }
                }
            } else if (Array.isArray(prerequisites)) {
                for (const p of prerequisites) {
                    if (p) {
                        update.push({
                            value: p?.value ? p.value : p,
                        });
                    }
                }
            }
            itemData.data.prerequisites = { value: update };
        }
    }
}
