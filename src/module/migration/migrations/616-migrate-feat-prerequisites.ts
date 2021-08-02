import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

export class Migration616MigrateFeatPrerequisites extends MigrationBase {
    static override version = 0.616;

    override async updateItem(itemData: ItemSourcePF2e) {
        if (itemData.type === "feat") {
            const update: { value: string }[] = [];
            const prerequisites: any = itemData.data.prerequisites;
            if (prerequisites.value) {
                if (typeof prerequisites.value === "string") {
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
