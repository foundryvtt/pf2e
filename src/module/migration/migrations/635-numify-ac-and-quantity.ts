import { ActorSourcePF2e } from "@actor/data";
import { ItemSourcePF2e } from "@item/data";
import { isPhysicalData } from "@item/data/helpers";
import { MigrationBase } from "../base";

/** Ensure AC and quantity values are numeric */
export class Migration635NumifyACAndQuantity extends MigrationBase {
    static override version = 0.635;

    override async updateActor(actorData: ActorSourcePF2e): Promise<void> {
        if (actorData.type === "hazard" || actorData.type === "npc" || actorData.type === "vehicle") {
            actorData.system.attributes.ac.value = Number(actorData.system.attributes.ac.value);
        }
    }

    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if (isPhysicalData(itemData)) {
            const quantity = itemData.system.quantity || { value: 0 };
            if (quantity instanceof Object) {
                quantity.value = Number(quantity.value);
            }
        }
    }
}
