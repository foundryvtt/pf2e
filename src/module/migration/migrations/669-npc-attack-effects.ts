import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { MigrationBase } from "../base.ts";
import { sluggify } from "@util";

export class Migration669NPCAttackEffects extends MigrationBase {
    static override version = 0.669;

    override async updateItem(item: ItemSourcePF2e, actor?: ActorSourcePF2e): Promise<void> {
        if (!actor || item.type !== "melee") return;
        item.system.attackEffects ??= { value: [] };
        if (Array.isArray(item.system.attackEffects.value)) {
            item.system.attackEffects.value.forEach((entry, index, arr) => {
                arr[index] = sluggify(entry);
            });
        }
    }
}
