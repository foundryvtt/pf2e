import { ActorSourcePF2e } from "@actor/data/index.ts";
import { ItemSourcePF2e } from "@item/base/data/index.ts";
import { itemIsOfType } from "@item/helpers.ts";
import { MigrationBase } from "../base.ts";

/** Ensure AC and quantity values are numeric */
export class Migration635NumifyACAndQuantity extends MigrationBase {
    static override version = 0.635;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type === "hazard" || source.type === "npc" || source.type === "vehicle") {
            source.system.attributes.ac.value = Number(source.system.attributes.ac.value);
        }
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (itemIsOfType(source, "physical")) {
            const quantity = source.system.quantity || { value: 0 };
            if (quantity instanceof Object) {
                quantity.value = Number(quantity.value);
            }
        }
    }
}
