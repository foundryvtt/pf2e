import { ActorSourcePF2e } from "@actor/data";
import { ItemSourcePF2e } from "@item/data";
import { isPhysicalData } from "@item/data/helpers";
import { MigrationBase } from "../base";

export class Migration635NumifyACAndQuantity extends MigrationBase {
    static override version = 0.635;

    override async updateActor(actorData: ActorSourcePF2e): Promise<void> {
        if (actorData.type === "hazard" || actorData.type === "npc" || actorData.type === "vehicle") {
            actorData.data.attributes.ac.value = Number(actorData.data.attributes.ac.value);
        }
    }

    override async updateItem(itemData: ItemSourcePF2e): Promise<void> {
        if (isPhysicalData(itemData)) {
            itemData.data.quantity.value = Number(itemData.data.quantity.value);
        }
    }
}
