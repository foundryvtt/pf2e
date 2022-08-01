import { ItemSourcePF2e } from "@item/data";
import { MigrationBase } from "../base";

/** Fix featType properties erroneously set to a non-existent "dedication" type */
export class Migration732FixDedicationFeatTypes extends MigrationBase {
    static override version = 0.732;

    #hasWellFormedFeatType(featType: unknown): boolean {
        return featType instanceof Object && "value" in featType && typeof featType["value"] === "string";
    }

    override async updateItem(source: ItemSourcePF2e): Promise<void> {
        if (source.type === "feat") {
            if (!this.#hasWellFormedFeatType(source.system.featType)) {
                source.system.featType = { value: "bonus" };
            }

            const featType: { value: string } = source.system.featType;
            const shouldBeArchetype =
                featType.value === "dedication" ||
                (featType.value === "class" && source.system.slug?.endsWith("-dedication"));

            if (shouldBeArchetype) featType.value = "archetype";
        }
    }
}
