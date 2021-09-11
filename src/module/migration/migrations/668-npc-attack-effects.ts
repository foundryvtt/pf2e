import { ActorSourcePF2e } from "@actor/data";
import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";
import { sluggify } from "@module/utils";

export class Migration668npcAttackEffects extends MigrationBase {
    static override version = 0.668;

    override async updateItem(item: ItemSourcePF2e, actor?: ActorSourcePF2e) {
        if (!actor || item.type !== "melee") return;
        if (Array.isArray(item.data.attackEffects.value)) {
            item.data.attackEffects.value.forEach((entry, index, arr) => {
                arr[index] = sluggify(entry);
            });
        }
    }
}
