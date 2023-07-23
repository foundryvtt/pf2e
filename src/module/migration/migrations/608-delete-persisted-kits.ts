import { MigrationBase } from "../base.ts";
import { ItemSourcePF2e } from "@item/data/index.ts";
import { ActorSourcePF2e } from "@actor/data/index.ts";

/** Unbreak actor sheets that have kit items in their inventories */
export class Migration608DeletePersistedKits extends MigrationBase {
    static override version = 0.608;

    override async updateItem(itemData: ItemSourcePF2e, actorData?: ActorSourcePF2e): Promise<void> {
        if (actorData && itemData.type === "kit") {
            const index = actorData.items.indexOf(itemData);
            actorData.items.splice(index, 1);
        }
    }
}
