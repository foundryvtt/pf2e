import { ActorSourcePF2e } from "@actor/data";
import { MigrationBase } from "../base";

/** Remove value property from loot actor description */
export class Migration810LootDescriptionValue extends MigrationBase {
    static override version = 0.81;

    override async updateActor(source: ActorSourcePF2e): Promise<void> {
        if (source.type === "loot") {
            const details: MaybeWithValue = source.system.details;
            if (details.description instanceof Object) {
                details.description = String(details.description.value ?? "");
            }
        }
    }
}

interface MaybeWithValue {
    description: { value: string } | string;
}
