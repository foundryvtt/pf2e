import { ItemSourcePF2e } from "@item/data/index.ts";
import { FeatSystemSource } from "@item/feat/data.ts";
import { isObject } from "@util";
import { MigrationBase } from "../base.ts";

/** Fix featType properties erroneously set to a non-existent "dedication" type */
export class Migration732FixDedicationFeatTypes extends MigrationBase {
    static override version = 0.732;

    #hasWellFormedFeatType(system: FeatSystemSource): system is FeatSystemSource & { featType: { value: string } } {
        return (
            "featType" in system &&
            isObject(system.featType) &&
            "value" in system.featType &&
            typeof system.featType === "string"
        );
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "feat") {
            const system: FeatSystemSource & { featType?: { value: string } } = source.system;
            if (!this.#hasWellFormedFeatType(system)) {
                system.featType = { value: "bonus" };
            } else {
                const { featType } = system;
                const shouldBeArchetype =
                    featType.value === "dedication" ||
                    (featType.value === "class" && source.system.slug?.endsWith("-dedication"));

                if (shouldBeArchetype) featType.value = "archetype";
            }
        }
    }
}
